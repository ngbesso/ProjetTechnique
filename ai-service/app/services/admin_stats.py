import asyncio
import json

import httpx

from app.core.config import settings

STATS_ENDPOINTS = {
    "membres": "/members/admin/stats",
    "dons": "/api/donations/admin/stats",
    "evenements": "/events/admin/stats",
    "sermons": "/sermons/admin/stats",
    "articles": "/posts/admin/stats",
    "eglises": "/churches/admin/stats",
    "depenses": "/expenses/admin/stats",
    "actualites": "/news/admin/stats",
    "leadership": "/leaders/admin/stats",
    "ministeres": "/ministries/admin/stats",
    "prieres": "/prayer-requests/admin/stats",
    "benevolat": "/volunteer-requests/admin/stats",
}

# Mots-clés utilisés pour ne garder, dans le contexte envoyé au LLM, que les
# categories pertinentes a la question posee (le contexte complet des 12
# categories est trop volumineux pour tenir dans le budget de temps d'Ollama
# sur ce CPU). Repli sur toutes les categories si aucun mot-cle ne matche,
# pour ne pas casser les questions transversales ou ambigues.
CATEGORY_KEYWORDS = {
    "membres": ["membre", "adherent", "adhesion", "famille"],
    "dons": ["don", "donation", "donateur", "donatrice", "montant", "cad", "usd"],
    "evenements": ["evenement", "evenements", "inscription", "formation"],
    "sermons": ["sermon", "predicateur", "preche"],
    "articles": ["article", "blog", "post"],
    "eglises": ["eglise", "eglises", "affilie", "affiliee"],
    "depenses": ["depense", "depenses", "budget"],
    "actualites": ["actualite", "actualites", "news"],
    "leadership": ["leader", "leadership", "dirigeant"],
    "ministeres": ["ministere", "ministeres"],
    "prieres": ["priere", "prieres"],
    "benevolat": ["benevole", "benevolat", "volontaire"],
}


def _normalize(text: str) -> str:
    replacements = str.maketrans("éèêëàâäîïôöùûüç", "eeeeaaaiioouuuc")
    return text.lower().translate(replacements)


def relevant_categories(question: str) -> set[str]:
    """Categories dont les mots-cles apparaissent dans la question. Ensemble
    vide si aucun match, auquel cas l'appelant doit se rabattre sur tout."""
    normalized = _normalize(question)
    return {
        label
        for label, keywords in CATEGORY_KEYWORDS.items()
        if any(keyword in normalized for keyword in keywords)
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


def build_context(stats: dict[str, dict], question: str = "") -> str:
    wanted = relevant_categories(question)
    selected = {
        label: data for label, data in stats.items() if not wanted or label in wanted
    }
    blocks = [
        f"[{label}]\n{json.dumps(data, ensure_ascii=False)}"
        for label, data in selected.items()
    ]
    return "\n\n---\n\n".join(blocks)
