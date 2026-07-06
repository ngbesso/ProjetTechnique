from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.models.post import Post, PostStatus
from app.schemas.post import PostCreate, PostList, PostRead, PostUpdate

router = APIRouter(prefix="/posts", tags=["blog"])
can_manage = Depends(require_global_permission("post:manage"))


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
    db.delete(post)
    db.commit()
