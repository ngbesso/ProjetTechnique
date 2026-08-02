from typing import Annotated

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.models.news import News, NewsStatus
from app.schemas.news import (
    NewsAdminStats,
    NewsCreate,
    NewsList,
    NewsRead,
    NewsUpdate,
)
from app.services import news_service, storage

router = APIRouter(prefix="/news", tags=["actualités"])
can_manage = Depends(require_global_permission("news:manage"))

_COVER_PREFIX = "news/covers"


def _load(db: Session, news_id: int) -> News:
    item = news_service.get_news(db, news_id)
    if not item:
        raise HTTPException(404, "Actualité introuvable")
    return item


@router.get("", response_model=NewsList)
def list_news(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    category: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items, total = news_service.list_published(
        db, q=q, category=category, limit=limit, offset=offset
    )
    return NewsList(items=items, total=total, limit=limit, offset=offset)


@router.get("/admin", response_model=NewsList, dependencies=[can_manage])
def list_news_admin(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    category: str | None = None,
    status: NewsStatus | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    items, total = news_service.list_all(
        db, q=q, category=category, status=status, limit=limit, offset=offset
    )
    return NewsList(items=items, total=total, limit=limit, offset=offset)


@router.get("/admin/stats", response_model=NewsAdminStats, dependencies=[can_manage])
def get_news_stats(db: Annotated[Session, Depends(get_db)]):
    """Répartition par statut, nombre d'épinglées, total des vues et top 5 des plus lues."""
    return news_service.get_admin_stats(db)


@router.get("/categories", response_model=list[str])
def list_categories(db: Annotated[Session, Depends(get_db)]):
    return news_service.list_categories(db)


@router.get("/featured", response_model=list[NewsRead])
def list_featured(
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(5, ge=1, le=10),
):
    """Items à mettre en avant sur le carrousel d'accueil."""
    return news_service.list_featured(db, limit=limit)


@router.get("/{news_id}", response_model=NewsRead)
def get_news_item(news_id: int, db: Annotated[Session, Depends(get_db)]):
    item = _load(db, news_id)
    if item.status != NewsStatus.published:
        raise HTTPException(404, "Actualité introuvable")
    return news_service.increment_views(db, item)


@router.post("", response_model=NewsRead, status_code=201, dependencies=[can_manage])
def create_news_item(data: NewsCreate, db: Annotated[Session, Depends(get_db)]):
    return news_service.create_news(db, data)


@router.patch("/{news_id}", response_model=NewsRead, dependencies=[can_manage])
def update_news_item(
    news_id: int, data: NewsUpdate, db: Annotated[Session, Depends(get_db)]
):
    return news_service.update_news(db, _load(db, news_id), data)


@router.delete("/{news_id}", status_code=204, dependencies=[can_manage])
def delete_news_item(news_id: int, db: Annotated[Session, Depends(get_db)]):
    item = _load(db, news_id)
    if item.cover_image_url and item.cover_image_url.startswith("/news/"):
        storage.delete_file_quiet(f"{_COVER_PREFIX}/{news_id}")
    news_service.delete_news(db, item)


# ── Cover image ───────────────────────────────────────────────────────────────


@router.get("/{news_id}/cover")
def get_cover(news_id: int, db: Annotated[Session, Depends(get_db)]):
    """Sert l'image de couverture depuis MinIO — accessible sans authentification."""
    item = _load(db, news_id)
    if not item.cover_image_url:
        raise HTTPException(404, "Pas de couverture")
    try:
        obj = storage.get_object(f"{_COVER_PREFIX}/{news_id}")
    except ClientError:
        raise HTTPException(404, "Image introuvable")
    content_type = obj.get("ContentType", "image/jpeg")
    return StreamingResponse(
        obj["Body"].iter_chunks(1024 * 256),
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.post("/{news_id}/cover", response_model=NewsRead, dependencies=[can_manage])
def upload_cover(
    news_id: int,
    file: Annotated[UploadFile, File()],
    db: Annotated[Session, Depends(get_db)],
):
    """Téléverse une image de couverture dans MinIO et met à jour l'actualité."""
    item = _load(db, news_id)
    content_type = file.content_type or "image/jpeg"
    storage.upload_file(file.file, f"{_COVER_PREFIX}/{news_id}", content_type)
    return news_service.set_cover_url(db, item, f"/news/{news_id}/cover")


@router.delete("/{news_id}/cover", status_code=204, dependencies=[can_manage])
def delete_cover(news_id: int, db: Annotated[Session, Depends(get_db)]):
    """Supprime l'image de couverture de MinIO et efface le champ."""
    item = _load(db, news_id)
    storage.delete_file_quiet(f"{_COVER_PREFIX}/{news_id}")
    news_service.set_cover_url(db, item, None)
