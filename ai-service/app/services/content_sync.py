from dataclasses import dataclass

import httpx

from app.core.config import settings


@dataclass
class Document:
    id: int
    type: str  # "post" | "sermon" | "event" | "church" | "info"
    title: str
    text: str


async def _fetch_all_items(
    client: httpx.AsyncClient, path: str, extra_params: dict | None = None
) -> list[dict]:
    """Parcourt toutes les pages d'une liste paginée du backend."""
    items: list[dict] = []
    offset = 0
    limit = 100
    base_params = extra_params or {}
    while True:
        params = {**base_params, "limit": limit, "offset": offset}
        res = await client.get(path, params=params)
        res.raise_for_status()
        page = res.json()
        items.extend(page["items"])
        offset += limit
        if offset >= page["total"] or not page["items"]:
            break
    return items


def _general_info_documents() -> list[Document]:
    """Contenu statique (non issu du backend) sur la mission, l'adhésion et les dons,
    repris du contenu affiché sur les pages Accueil / Devenir membre / Faire un don."""
    return [
        Document(
            id=-1,
            type="info",
            title="Notre mission et nos valeurs",
            text=(
                "Fondée il y a plus de 40 ans, Mission Évangélique fédère plus de 120 Églises "
                "affiliées et plus de 15 000 membres actifs dans 8 pays, autour d'une vision "
                "commune : faire des disciples dans chaque communauté et chaque nation. "
                "Vision : une église par communauté, un disciple par foyer. "
                "Mission : évangéliser, enraciner et envoyer. "
                "Valeurs : intégrité, amour fraternel, excellence. "
                "Crédo : la Bible, seule règle de foi et de vie. "
                "Principes : gouvernance partagée, transparence et service."
            ),
        ),
        Document(
            id=-2,
            type="info",
            title="Comment devenir membre",
            text=(
                "Pour devenir membre, il suffit de remplir le formulaire d'adhésion sur la page "
                "'Devenir membre', en choisissant son Église et en indiquant ses coordonnées et "
                "son statut de baptême. L'adhésion est gratuite et sans engagement. Selon la "
                "configuration de l'Église choisie, la demande est soit approuvée immédiatement "
                "(un courriel d'activation de compte est alors envoyé), soit examinée par un "
                "administrateur sous 48h avec un courriel de confirmation à la suite. Une fois "
                "membre, on accède à un espace membre personnel."
            ),
        ),
        Document(
            id=-3,
            type="info",
            title="Comment faire un don",
            text=(
                "Les dons se font en ligne depuis la page 'Faire un don' du site, au bénéfice de "
                "l'Église affiliée de son choix."
            ),
        ),
    ]


async def fetch_documents() -> list[Document]:
    """Récupère les articles, sermons, événements et Églises publiés depuis le backend
    public, complétés par les informations générales statiques sur la mission."""
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

        events = await _fetch_all_items(
            client, "/api/events/", extra_params={"upcoming_only": "false"}
        )
        for e in events:
            parts = [e["title"]]
            if e.get("category"):
                parts.append(f"Catégorie : {e['category']}")
            if e.get("description"):
                parts.append(e["description"])
            if e.get("location"):
                parts.append(f"Lieu : {e['location']}")
            if e.get("instructor"):
                parts.append(f"Intervenant : {e['instructor']}")
            if e.get("date_start"):
                parts.append(f"Date : {e['date_start']}")
            documents.append(
                Document(
                    id=e["id"], type="event", title=e["title"], text=" — ".join(parts)
                )
            )

        churches_res = await client.get("/churches")
        churches_res.raise_for_status()
        for c in churches_res.json():
            if not c.get("is_active", True):
                continue
            parts = [c["name"]]
            if c.get("district"):
                parts.append(f"District : {c['district']}")
            if c.get("address"):
                parts.append(f"Adresse : {c['address']}")
            if c.get("pastor_name"):
                parts.append(f"Pasteur : {c['pastor_name']}")
            documents.append(
                Document(
                    id=c["id"], type="church", title=c["name"], text=" — ".join(parts)
                )
            )

    documents.extend(_general_info_documents())
    return documents
