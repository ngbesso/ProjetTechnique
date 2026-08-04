from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.db.pagination import paginate
from app.models.post import Post, PostStatus
from app.schemas.post import PostAdminStats, PostCreate, PostUpdate, TopPostItem


def _search(query: Select, term: str) -> Select:
    like = f"%{term}%"
    return query.where(
        Post.title.ilike(like) | Post.author.ilike(like) | Post.excerpt.ilike(like)
    )


def get_post(db: Session, post_id: int) -> Post | None:
    return db.get(Post, post_id)


def list_published(
    db: Session,
    *,
    q: str | None = None,
    category: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Post], int]:
    query = select(Post).where(Post.status == PostStatus.published)
    if q:
        query = _search(query, q)
    if category:
        query = query.where(Post.category == category)
    return paginate(db, query.order_by(Post.created_at.desc()), limit, offset)


def list_all(
    db: Session,
    *,
    q: str | None = None,
    category: str | None = None,
    status: PostStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Post], int]:
    query = select(Post)
    if q:
        query = _search(query, q)
    if category:
        query = query.where(Post.category == category)
    if status:
        query = query.where(Post.status == status)
    return paginate(db, query.order_by(Post.created_at.desc()), limit, offset)


def list_categories(db: Session) -> list[str]:
    return list(
        db.scalars(
            select(Post.category)
            .where(Post.status == PostStatus.published, Post.category.isnot(None))
            .distinct()
            .order_by(Post.category)
        ).all()
    )


def create_post(db: Session, payload: PostCreate) -> Post:
    item = Post(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_post(db: Session, item: Post, payload: PostUpdate) -> Post:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


def increment_views(db: Session, item: Post) -> Post:
    item.views += 1
    db.commit()
    db.refresh(item)
    return item


def set_cover_url(db: Session, item: Post, cover_image_url: str | None) -> Post:
    item.cover_image_url = cover_image_url
    db.commit()
    db.refresh(item)
    return item


def delete_post(db: Session, item: Post) -> None:
    db.delete(item)
    db.commit()


def get_admin_stats(db: Session) -> PostAdminStats:
    """Publiés/brouillons, total des vues et top 5 des articles les plus lus."""
    status_map: dict[PostStatus, int] = dict(
        db.execute(select(Post.status, func.count(Post.id)).group_by(Post.status)).all()
    )
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
