from dataclasses import dataclass

import httpx

from app.core.config import settings


@dataclass
class Document:
    id: int
    type: str  # "post" | "sermon"
    title: str
    text: str


async def fetch_documents() -> list[Document]:
    """Récupère les articles et sermons publiés depuis le backend public."""
    documents: list[Document] = []
    async with httpx.AsyncClient(base_url=settings.backend_url, timeout=10.0) as client:
        posts_res = await client.get("/posts", params={"limit": 100})
        posts_res.raise_for_status()
        for p in posts_res.json()["items"]:
            documents.append(
                Document(id=p["id"], type="post", title=p["title"], text=p["content"])
            )

        sermons_res = await client.get("/sermons", params={"limit": 100})
        sermons_res.raise_for_status()
        for s in sermons_res.json()["items"]:
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
