from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.models.news import News, NewsStatus
from app.schemas.common import Page
from app.schemas.news import NewsCreate, NewsRead, NewsUpdate
from app.services.content_service import ContentService

router = APIRouter(prefix="/news", tags=["actualités"])
can_manage = Depends(require_global_permission("news:manage"))

news = ContentService(News, NewsStatus, route_prefix="news", not_found_message="Actualité introuvable")


@router.get("", response_model=Page[NewsRead])
def list_news(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    category: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items, total = news.list_public(db, q=q, category=category, limit=limit, offset=offset)
    return Page[NewsRead](items=items, total=total, limit=limit, offset=offset)


@router.get("/admin", response_model=Page[NewsRead], dependencies=[can_manage])
def list_news_admin(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    category: str | None = None,
    status: NewsStatus | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    items, total = news.list_admin(
        db, q=q, category=category, status=status, limit=limit, offset=offset
    )
    return Page[NewsRead](items=items, total=total, limit=limit, offset=offset)


@router.get("/categories", response_model=list[str])
def list_categories(db: Annotated[Session, Depends(get_db)]):
    return news.list_categories(db)


@router.get("/featured", response_model=list[NewsRead])
def list_featured(
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(5, ge=1, le=10),
):
    """Items à mettre en avant sur le carrousel d'accueil : les actualités
    épinglées (is_featured) en premier, triées par position, puis complétées
    par les plus récentes non-épinglées jusqu'à `limit` — jamais vide tant
    qu'il existe des actualités publiées."""
    featured = db.scalars(
        select(News)
        .where(News.status == NewsStatus.published, News.is_featured.is_(True))
        .order_by(News.position, News.created_at.desc())
        .limit(limit)
    ).all()
    remaining = limit - len(featured)
    if remaining <= 0:
        return list(featured)
    exclude_ids = [n.id for n in featured]
    fallback_query = select(News).where(News.status == NewsStatus.published)
    if exclude_ids:
        fallback_query = fallback_query.where(News.id.notin_(exclude_ids))
    fallback = db.scalars(
        fallback_query.order_by(News.created_at.desc()).limit(remaining)
    ).all()
    return [*featured, *fallback]


@router.get("/{news_id}", response_model=NewsRead)
def get_news_item(news_id: int, db: Annotated[Session, Depends(get_db)]):
    return news.get_and_increment_views(db, news_id)


@router.post("", response_model=NewsRead, status_code=201, dependencies=[can_manage])
def create_news_item(data: NewsCreate, db: Annotated[Session, Depends(get_db)]):
    return news.create(db, data)


@router.patch("/{news_id}", response_model=NewsRead, dependencies=[can_manage])
def update_news_item(
    news_id: int, data: NewsUpdate, db: Annotated[Session, Depends(get_db)]
):
    return news.update(db, news.load(db, news_id), data)


@router.delete("/{news_id}", status_code=204, dependencies=[can_manage])
def delete_news_item(news_id: int, db: Annotated[Session, Depends(get_db)]):
    news.delete(db, news.load(db, news_id))


# ── Cover image ───────────────────────────────────────────────────────────────


@router.get("/{news_id}/cover")
def get_cover(news_id: int, db: Annotated[Session, Depends(get_db)]):
    """Sert l'image de couverture depuis MinIO — accessible sans authentification."""
    obj = news.get_cover_object(db, news_id)
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
    return news.upload_cover(db, news_id, file.file, file.content_type or "image/jpeg")


@router.delete("/{news_id}/cover", status_code=204, dependencies=[can_manage])
def delete_cover(news_id: int, db: Annotated[Session, Depends(get_db)]):
    """Supprime l'image de couverture de MinIO et efface le champ."""
    news.delete_cover(db, news_id)
