from typing import Annotated

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.models.news import News, NewsStatus
from app.schemas.news import NewsCreate, NewsList, NewsRead, NewsUpdate
from app.services import storage

router = APIRouter(prefix="/news", tags=["actualités"])
can_manage = Depends(require_global_permission("news:manage"))

_COVER_PREFIX = "news/covers"


def _load(db: Session, news_id: int) -> News:
    item = db.get(News, news_id)
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
    query = select(News).where(News.status == NewsStatus.published)
    if q:
        term = f"%{q}%"
        query = query.where(
            News.title.ilike(term) | News.author.ilike(term) | News.excerpt.ilike(term)
        )
    if category:
        query = query.where(News.category == category)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(
        query.order_by(News.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return NewsList(items=list(items), total=total or 0, limit=limit, offset=offset)


@router.get("/admin", response_model=NewsList, dependencies=[can_manage])
def list_news_admin(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    category: str | None = None,
    status: NewsStatus | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    query = select(News)
    if q:
        term = f"%{q}%"
        query = query.where(
            News.title.ilike(term) | News.author.ilike(term) | News.excerpt.ilike(term)
        )
    if category:
        query = query.where(News.category == category)
    if status:
        query = query.where(News.status == status)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(
        query.order_by(News.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return NewsList(items=list(items), total=total or 0, limit=limit, offset=offset)


@router.get("/categories", response_model=list[str])
def list_categories(db: Annotated[Session, Depends(get_db)]):
    rows = db.scalars(
        select(News.category)
        .where(News.status == NewsStatus.published, News.category.isnot(None))
        .distinct()
        .order_by(News.category)
    ).all()
    return list(rows)


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
    item = _load(db, news_id)
    if item.status != NewsStatus.published:
        raise HTTPException(404, "Actualité introuvable")
    item.views += 1
    db.commit()
    db.refresh(item)
    return item


@router.post("", response_model=NewsRead, status_code=201, dependencies=[can_manage])
def create_news_item(data: NewsCreate, db: Annotated[Session, Depends(get_db)]):
    item = News(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{news_id}", response_model=NewsRead, dependencies=[can_manage])
def update_news_item(
    news_id: int, data: NewsUpdate, db: Annotated[Session, Depends(get_db)]
):
    item = _load(db, news_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{news_id}", status_code=204, dependencies=[can_manage])
def delete_news_item(news_id: int, db: Annotated[Session, Depends(get_db)]):
    item = _load(db, news_id)
    if item.cover_image_url and item.cover_image_url.startswith("/news/"):
        try:
            storage.delete_file(f"{_COVER_PREFIX}/{news_id}")
        except Exception:
            pass
    db.delete(item)
    db.commit()


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
    item.cover_image_url = f"/news/{news_id}/cover"
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{news_id}/cover", status_code=204, dependencies=[can_manage])
def delete_cover(news_id: int, db: Annotated[Session, Depends(get_db)]):
    """Supprime l'image de couverture de MinIO et efface le champ."""
    item = _load(db, news_id)
    try:
        storage.delete_file(f"{_COVER_PREFIX}/{news_id}")
    except Exception:
        pass
    item.cover_image_url = None
    db.commit()
