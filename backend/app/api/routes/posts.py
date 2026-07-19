from typing import Annotated

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.models.post import Post, PostStatus
from app.schemas.post import PostAdminStats, PostCreate, PostList, PostRead, PostUpdate, TopPostItem
from app.services import storage

router = APIRouter(prefix="/posts", tags=["blog"])
can_manage = Depends(require_global_permission("post:manage"))

_COVER_PREFIX = "posts/covers"


def _load(db: Session, post_id: int) -> Post:
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Article introuvable")
    return post


@router.get("", response_model=PostList)
def list_posts(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    category: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    query = select(Post).where(Post.status == PostStatus.published)
    if q:
        term = f"%{q}%"
        query = query.where(
            Post.title.ilike(term) | Post.author.ilike(term) | Post.excerpt.ilike(term)
        )
    if category:
        query = query.where(Post.category == category)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(
        query.order_by(Post.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return PostList(items=list(items), total=total or 0, limit=limit, offset=offset)


@router.get("/admin", response_model=PostList, dependencies=[can_manage])
def list_posts_admin(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    category: str | None = None,
    status: PostStatus | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    query = select(Post)
    if q:
        term = f"%{q}%"
        query = query.where(
            Post.title.ilike(term) | Post.author.ilike(term) | Post.excerpt.ilike(term)
        )
    if category:
        query = query.where(Post.category == category)
    if status:
        query = query.where(Post.status == status)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(
        query.order_by(Post.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return PostList(items=list(items), total=total or 0, limit=limit, offset=offset)


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
    rows = db.scalars(
        select(Post.category)
        .where(Post.status == PostStatus.published, Post.category.isnot(None))
        .distinct()
        .order_by(Post.category)
    ).all()
    return list(rows)


@router.get("/{post_id}", response_model=PostRead)
def get_post(post_id: int, db: Annotated[Session, Depends(get_db)]):
    post = _load(db, post_id)
    if post.status != PostStatus.published:
        raise HTTPException(404, "Article introuvable")
    post.views += 1
    db.commit()
    db.refresh(post)
    return post


@router.post("", response_model=PostRead, status_code=201, dependencies=[can_manage])
def create_post(data: PostCreate, db: Annotated[Session, Depends(get_db)]):
    post = Post(**data.model_dump())
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.patch("/{post_id}", response_model=PostRead, dependencies=[can_manage])
def update_post(
    post_id: int, data: PostUpdate, db: Annotated[Session, Depends(get_db)]
):
    post = _load(db, post_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(post, k, v)
    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}", status_code=204, dependencies=[can_manage])
def delete_post(post_id: int, db: Annotated[Session, Depends(get_db)]):
    post = _load(db, post_id)
    if post.cover_image_url and post.cover_image_url.startswith("/posts/"):
        try:
            storage.delete_file(f"{_COVER_PREFIX}/{post_id}")
        except Exception:
            pass
    db.delete(post)
    db.commit()


# ── Cover image ───────────────────────────────────────────────────────────────


@router.get("/{post_id}/cover")
def get_cover(post_id: int, db: Annotated[Session, Depends(get_db)]):
    """Sert l'image de couverture depuis MinIO — accessible sans authentification."""
    post = _load(db, post_id)
    if not post.cover_image_url:
        raise HTTPException(404, "Pas de couverture")
    try:
        obj = storage.get_object(f"{_COVER_PREFIX}/{post_id}")
    except ClientError:
        raise HTTPException(404, "Image introuvable")
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
    post = _load(db, post_id)
    content_type = file.content_type or "image/jpeg"
    storage.upload_file(file.file, f"{_COVER_PREFIX}/{post_id}", content_type)
    post.cover_image_url = f"/posts/{post_id}/cover"
    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}/cover", status_code=204, dependencies=[can_manage])
def delete_cover(post_id: int, db: Annotated[Session, Depends(get_db)]):
    """Supprime l'image de couverture de MinIO et efface le champ."""
    post = _load(db, post_id)
    try:
        storage.delete_file(f"{_COVER_PREFIX}/{post_id}")
    except Exception:
        pass
    post.cover_image_url = None
    db.commit()
