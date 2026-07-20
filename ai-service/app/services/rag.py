import asyncio
import logging

import httpx

from app.core.config import settings
from app.services.content_sync import fetch_documents
from app.services.embeddings import embed
from app.services.vector_store import ScoredDocument, vector_store

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "Tu es l'assistant virtuel de la Mission Évangélique, une plateforme pour une "
    "communauté d'Églises affiliées. Réponds aux questions des visiteurs UNIQUEMENT à "
    "partir des extraits de contenu fournis ci-dessous (articles de blog et sermons). "
    "Si l'information demandée ne s'y trouve pas, dis clairement que tu ne sais pas et "
    "invite la personne à consulter les pages Blog ou Sermons du site. N'invente jamais "
    "d'information. Réponds en français, de façon concise et chaleureuse."
)


async def warm_up_llm() -> None:
    """Déclenche le chargement du modèle Ollama en mémoire pour éviter le
    cold-start (~1 min) sur la première question d'un visiteur."""
    try:
        async with httpx.AsyncClient(
            base_url=settings.ollama_url, timeout=120.0
        ) as client:
            await client.post(
                "/api/chat",
                json={
                    "model": settings.ollama_model,
                    "stream": False,
                    "messages": [{"role": "user", "content": "Bonjour"}],
                },
            )
    except httpx.HTTPError:
        logger.exception("Échec du préchauffage du modèle Ollama")


async def refresh_index() -> int:
    """Recharge l'index vectoriel depuis le contenu publié du backend."""
    documents = await fetch_documents()
    embeddings = await asyncio.to_thread(embed, [d.text for d in documents])
    vector_store.load(documents, embeddings)
    logger.info("Index RAG reconstruit : %d documents", len(documents))
    return len(documents)


def _build_context(scored_docs: list[ScoredDocument]) -> str:
    blocks = []
    for sd in scored_docs:
        kind = "Article de blog" if sd.document.type == "post" else "Sermon"
        blocks.append(f"[{kind}] {sd.document.title}\n{sd.document.text}")
    return "\n\n---\n\n".join(blocks)


async def answer(question: str) -> dict:
    if vector_store.size == 0:
        return {
            "answer": "Je n'ai pas encore de contenu indexé pour répondre à cette question.",
            "sources": [],
        }

    query_embedding = (await asyncio.to_thread(embed, [question]))[0]
    posts = vector_store.search(query_embedding, top_k=2, doc_type="post")
    sermons = vector_store.search(query_embedding, top_k=2, doc_type="sermon")
    scored_docs = sorted(posts + sermons, key=lambda sd: sd.score, reverse=True)
    context = _build_context(scored_docs)

    try:
        async with httpx.AsyncClient(
            base_url=settings.ollama_url, timeout=120.0
        ) as client:
            response = await client.post(
                "/api/chat",
                json={
                    "model": settings.ollama_model,
                    "stream": False,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": f"Contexte :\n\n{context}\n\n---\n\nQuestion : {question}",
                        },
                    ],
                },
            )
            response.raise_for_status()
        answer_text = response.json()["message"]["content"]
    except (httpx.HTTPError, KeyError, ValueError):
        logger.exception("Échec de l'appel au service Ollama")
        return {
            "answer": "Le service IA est temporairement indisponible. Réessaie plus tard.",
            "sources": [],
        }

    return {
        "answer": answer_text,
        "sources": [
            {"title": sd.document.title, "type": sd.document.type} for sd in scored_docs
        ],
    }
