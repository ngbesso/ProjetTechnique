from typing import Annotated

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.models.post import Post, PostStatus
from app.schemas.common import Page
from app.schemas.post import (
    PostAdminStats,
    PostCreate,
    PostRead,
    PostUpdate,
)
from app.services import post_service, storage

router = APIRouter(prefix="/posts", tags=["blog"])
can_manage = Depends(require_global_permission("post:manage"))

_COVER_PREFIX = "posts/covers"


def _load(db: Session, post_id: int) -> Post:
    item = post_service.get_post(db, post_id)
    if not item:
        raise HTTPException(404, "Article introuvable")
    return item


@router.get("", response_model=Page[PostRead])
def list_posts(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    category: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items, total = post_service.list_published(
        db, q=q, category=category, limit=limit, offset=offset
    )
    return Page[PostRead](items=items, total=total, limit=limit, offset=offset)


@router.get("/admin", response_model=Page[PostRead], dependencies=[can_manage])
def list_posts_admin(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    category: str | None = None,
    status: PostStatus | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    items, total = post_service.list_all(
        db, q=q, category=category, status=status, limit=limit, offset=offset
    )
    return Page[PostRead](items=items, total=total, limit=limit, offset=offset)


@router.get("/admin/stats", response_model=PostAdminStats, dependencies=[can_manage])
def get_posts_stats(db: Annotated[Session, Depends(get_db)]):
    """Publiés/brouillons, total des vues et top 5 des articles les plus lus."""
    return post_service.get_admin_stats(db)


@router.get("/categories", response_model=list[str])
def list_categories(db: Annotated[Session, Depends(get_db)]):
    return post_service.list_categories(db)


@router.get("/{post_id}", response_model=PostRead)
def get_post(post_id: int, db: Annotated[Session, Depends(get_db)]):
    item = _load(db, post_id)
    if item.status != PostStatus.published:
        raise HTTPException(404, "Article introuvable")
    return post_service.increment_views(db, item)


@router.post("", response_model=PostRead, status_code=201, dependencies=[can_manage])
def create_post(data: PostCreate, db: Annotated[Session, Depends(get_db)]):
    return post_service.create_post(db, data)


@router.patch("/{post_id}", response_model=PostRead, dependencies=[can_manage])
def update_post(
    post_id: int, data: PostUpdate, db: Annotated[Session, Depends(get_db)]
):
    return post_service.update_post(db, _load(db, post_id), data)


@router.delete("/{post_id}", status_code=204, dependencies=[can_manage])
def delete_post(post_id: int, db: Annotated[Session, Depends(get_db)]):
    item = _load(db, post_id)
    if item.cover_image_url and item.cover_image_url.startswith("/posts/"):
        storage.delete_file_quiet(f"{_COVER_PREFIX}/{post_id}")
    post_service.delete_post(db, item)


# ── Cover image ───────────────────────────────────────────────────────────────


@router.get("/{post_id}/cover")
def get_cover(post_id: int, db: Annotated[Session, Depends(get_db)]):
    """Sert l'image de couverture depuis MinIO — accessible sans authentification."""
    item = _load(db, post_id)
    if not item.cover_image_url:
        raise HTTPException(404, "Pas de couverture")
    try:
        obj = storage.get_object(f"{_COVER_PREFIX}/{post_id}")
    except ClientError:
        raise HTTPException(404, "Image introuvable") from None
    content_type = obj.get("ContentType", "image/jpeg")
    return StreamingResponse(
        obj["Body"].iter_chunks(1024 * 256),
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.post("/{post_id}/cover", response_model=PostRead, dependencies=[can_manage])
def upload_cover(
    post_id: int,
    file: Annotated[UploadFile, File()],
    db: Annotated[Session, Depends(get_db)],
):
    """Téléverse une image de couverture dans MinIO et met à jour l'article."""
    item = _load(db, post_id)
    content_type = file.content_type or "image/jpeg"
    storage.upload_file(file.file, f"{_COVER_PREFIX}/{post_id}", content_type)
    return post_service.set_cover_url(db, item, f"/posts/{post_id}/cover")


@router.delete("/{post_id}/cover", status_code=204, dependencies=[can_manage])
def delete_cover(post_id: int, db: Annotated[Session, Depends(get_db)]):
    """Supprime l'image de couverture de MinIO et efface le champ."""
    item = _load(db, post_id)
    storage.delete_file_quiet(f"{_COVER_PREFIX}/{post_id}")
    post_service.set_cover_url(db, item, None)
