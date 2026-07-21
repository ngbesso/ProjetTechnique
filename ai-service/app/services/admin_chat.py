import logging

import httpx

from app.core.config import settings
from app.services import admin_stats

logger = logging.getLogger(__name__)

ADMIN_SYSTEM_PROMPT = (
    "Tu es l'assistant d'administration de la plateforme Mission Évangélique. "
    "Réponds aux questions de l'administrateur UNIQUEMENT à partir des statistiques "
    "fournies ci-dessous (membres, dons, événements et formations, sermons, articles, "
    "Églises affiliées). N'invente JAMAIS un chiffre qui ne figure pas dans les "
    "données fournies — si la statistique demandée n'y est pas, dis-le clairement. "
    "Les statistiques sont fournies en JSON : respecte strictement ce que chaque champ "
    "représente d'après son nom (ex. un champ 'total_cad'/'total_usd' est un MONTANT "
    "en dollars, jamais un nombre d'éléments ; un champ 'count' ou 'total' sans devise "
    "est un DÉNOMBREMENT). Ne confonds jamais un montant monétaire avec un nombre de "
    "dons, de membres ou d'événements. Les listes commençant par 'top_' (top_sermons, "
    "top_posts, top_donors, top_churches, top_events) sont DÉJÀ TRIÉES par la "
    "plateforme, du plus élevé au plus faible (vues, montant, etc.) : le premier "
    "élément de la liste est donc toujours celui qui a la valeur la plus élevée. Pour "
    "une question sur le maximum ('le plus vu', 'le plus gros donateur', etc.), prends "
    "toujours le PREMIER élément de la liste correspondante, ne recalcule pas et ne "
    "compare pas les valeurs toi-même. Réponds en français, de façon concise et "
    "factuelle."
)


async def answer(question: str, authorization: str) -> dict:
    stats = await admin_stats.fetch_all_stats(authorization)
    if not stats:
        return {
            "answer": "Impossible de récupérer les statistiques pour le moment.",
            "used_stats": [],
        }

    context = admin_stats.build_context(stats)

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
                        {"role": "system", "content": ADMIN_SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": f"Statistiques :\n\n{context}\n\n---\n\nQuestion : {question}",
                        },
                    ],
                },
            )
            response.raise_for_status()
        answer_text = response.json()["message"]["content"]
    except (httpx.HTTPError, KeyError, ValueError):
        logger.exception("Échec de l'appel au service Ollama (assistant admin)")
        return {
            "answer": "Le service IA est temporairement indisponible. Réessaie plus tard.",
            "used_stats": list(stats.keys()),
        }

    return {"answer": answer_text, "used_stats": list(stats.keys())}
