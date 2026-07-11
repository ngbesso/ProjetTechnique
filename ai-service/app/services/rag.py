import logging

import anthropic

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


async def refresh_index() -> int:
    """Recharge l'index vectoriel depuis le contenu publié du backend."""
    documents = await fetch_documents()
    embeddings = embed([d.text for d in documents])
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

    query_embedding = embed([question])[0]
    scored_docs = vector_store.search(query_embedding, top_k=4)
    context = _build_context(scored_docs)

    if not settings.llm_api_key:
        return {
            "answer": "Le service IA n'est pas configuré (clé API manquante).",
            "sources": [],
        }

    client = anthropic.AsyncAnthropic(api_key=settings.llm_api_key)
    try:
        message = await client.messages.create(
            model=settings.llm_model,
            max_tokens=500,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Contexte :\n\n{context}\n\n---\n\nQuestion : {question}",
                }
            ],
        )
    except anthropic.APIError:
        logger.exception("Échec de l'appel à l'API Anthropic")
        return {
            "answer": "Le service IA est temporairement indisponible. Réessaie plus tard.",
            "sources": [],
        }
    answer_text = "".join(
        block.text for block in message.content if block.type == "text"
    )

    return {
        "answer": answer_text,
        "sources": [
            {"title": sd.document.title, "type": sd.document.type} for sd in scored_docs
        ],
    }
