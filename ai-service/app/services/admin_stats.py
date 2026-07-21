import asyncio
import json

import httpx

from app.core.config import settings

STATS_ENDPOINTS = {
    "membres": "/members/admin/stats",
    "dons": "/api/donations/admin/stats",
    "evenements": "/api/events/admin/stats",
    "sermons": "/sermons/admin/stats",
    "articles": "/posts/admin/stats",
    "eglises": "/churches/admin/stats",
}


async def fetch_all_stats(authorization: str) -> dict[str, dict]:
    """Récupère en parallèle les statistiques admin de chaque module. Un module
    dont l'appel échoue est simplement omis plutôt que de faire échouer le lot."""
    async with httpx.AsyncClient(
        base_url=settings.backend_url,
        timeout=10.0,
        headers={"Authorization": authorization},
    ) as client:

        async def _get(path: str) -> dict | None:
            try:
                res = await client.get(path)
                res.raise_for_status()
                return res.json()
            except httpx.HTTPError:
                return None

        results = await asyncio.gather(*(_get(p) for p in STATS_ENDPOINTS.values()))

    return {
        label: data
        for label, data in zip(STATS_ENDPOINTS.keys(), results)
        if data is not None
    }


def build_context(stats: dict[str, dict]) -> str:
    blocks = [
        f"[{label}]\n{json.dumps(data, ensure_ascii=False)}"
        for label, data in stats.items()
    ]
    return "\n\n---\n\n".join(blocks)
