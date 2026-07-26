from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
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
    TopPostItem,
)
from app.services.content_service import ContentService

router = APIRouter(prefix="/posts", tags=["blog"])
can_manage = Depends(require_global_permission("post:manage"))

posts = ContentService(Post, PostStatus, route_prefix="posts", not_found_message="Article introuvable")


@router.get("", response_model=Page[PostRead])
def list_posts(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    category: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items, total = posts.list_public(db, q=q, category=category, limit=limit, offset=offset)
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
    items, total = posts.list_admin(
        db, q=q, category=category, status=status, limit=limit, offset=offset
    )
    return Page[PostRead](items=items, total=total, limit=limit, offset=offset)


@router.get("/admin/stats", response_model=PostAdminStats, dependencies=[can_manage])
def get_posts_stats(db: Annotated[Session, Depends(get_db)]):
    """Publiés/brouillons, total des vues et top 5 des articles les plus lus."""
    status_rows = db.execute(
        select(Post.status, func.count(Post.id)).group_by(Post.status)
    ).all()
    status_map: dict[PostStatus, int] = dict(status_rows)

    total_views = db.scalar(select(func.coalesce(func.sum(Post.views), 0))) or 0

    top_rows = db.scalars(select(Post).order_by(Post.views.desc()).limit(5)).all()

    return PostAdminStats(
        published=status_map.get(PostStatus.published, 0),
        draft=status_map.get(PostStatus.draft, 0),
        total_views=total_views,
        top_posts=[
            TopPostItem(id=p.id, title=p.title, author=p.author, views=p.views)
            for p in top_rows
        ],
    )


@router.get("/categories", response_model=list[str])
def list_categories(db: Annotated[Session, Depends(get_db)]):
    return posts.list_categories(db)


@router.get("/{post_id}", response_model=PostRead)
def get_post(post_id: int, db: Annotated[Session, Depends(get_db)]):
    return posts.get_and_increment_views(db, post_id)


@router.post("", response_model=PostRead, status_code=201, dependencies=[can_manage])
def create_post(data: PostCreate, db: Annotated[Session, Depends(get_db)]):
    return posts.create(db, data)


@router.patch("/{post_id}", response_model=PostRead, dependencies=[can_manage])
def update_post(
    post_id: int, data: PostUpdate, db: Annotated[Session, Depends(get_db)]
):
    return posts.update(db, posts.load(db, post_id), data)


@router.delete("/{post_id}", status_code=204, dependencies=[can_manage])
def delete_post(post_id: int, db: Annotated[Session, Depends(get_db)]):
    posts.delete(db, posts.load(db, post_id))


# ── Cover image ───────────────────────────────────────────────────────────────


@router.get("/{post_id}/cover")
def get_cover(post_id: int, db: Annotated[Session, Depends(get_db)]):
    """Sert l'image de couverture depuis MinIO — accessible sans authentification."""
    obj = posts.get_cover_object(db, post_id)
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
    return posts.upload_cover(db, post_id, file.file, file.content_type or "image/jpeg")


@router.delete("/{post_id}/cover", status_code=204, dependencies=[can_manage])
def delete_cover(post_id: int, db: Annotated[Session, Depends(get_db)]):
    """Supprime l'image de couverture de MinIO et efface le champ."""
    posts.delete_cover(db, post_id)
