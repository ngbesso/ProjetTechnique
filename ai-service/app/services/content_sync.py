from dataclasses import dataclass

import httpx

from app.core.config import settings


@dataclass
class Document:
    id: int
    type: str  # "post" | "sermon"
    title: str
    text: str


async def _fetch_all_items(client: httpx.AsyncClient, path: str) -> list[dict]:
    """Parcourt toutes les pages d'une liste paginée du backend."""
    items: list[dict] = []
    offset = 0
    limit = 100
    while True:
        res = await client.get(path, params={"limit": limit, "offset": offset})
        res.raise_for_status()
        page = res.json()
        items.extend(page["items"])
        offset += limit
        if offset >= page["total"] or not page["items"]:
            break
    return items


async def fetch_documents() -> list[Document]:
    """Récupère les articles et sermons publiés depuis le backend public."""
    documents: list[Document] = []
    async with httpx.AsyncClient(base_url=settings.backend_url, timeout=10.0) as client:
        for p in await _fetch_all_items(client, "/posts"):
            documents.append(
                Document(id=p["id"], type="post", title=p["title"], text=p["content"])
            )

        for s in await _fetch_all_items(client, "/sermons"):
            parts = [s["title"]]
            if s.get("description"):
                parts.append(s["description"])
            if s.get("preacher"):
                parts.append(f"Prédicateur : {s['preacher']}")
            if s.get("series"):
                parts.append(f"Série : {s['series']}")
            documents.append(
                Document(
                    id=s["id"], type="sermon", title=s["title"], text=" — ".join(parts)
                )
            )

    return documents
