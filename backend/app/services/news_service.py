from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.news import News, NewsStatus
from app.schemas.news import NewsAdminStats, NewsCreate, NewsUpdate, TopNewsItem


def _search(query: Select, term: str) -> Select:
    like = f"%{term}%"
    return query.where(
        News.title.ilike(like) | News.author.ilike(like) | News.excerpt.ilike(like)
    )


def _page(db: Session, query: Select, limit: int, offset: int) -> tuple[list[News], int]:
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(
        query.order_by(News.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return list(items), total


def get_news(db: Session, news_id: int) -> News | None:
    return db.get(News, news_id)


def list_published(
    db: Session,
    *,
    q: str | None = None,
    category: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[News], int]:
    query = select(News).where(News.status == NewsStatus.published)
    if q:
        query = _search(query, q)
    if category:
        query = query.where(News.category == category)
    return _page(db, query, limit, offset)


def list_all(
    db: Session,
    *,
    q: str | None = None,
    category: str | None = None,
    status: NewsStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[News], int]:
    query = select(News)
    if q:
        query = _search(query, q)
    if category:
        query = query.where(News.category == category)
    if status:
        query = query.where(News.status == status)
    return _page(db, query, limit, offset)


def list_categories(db: Session) -> list[str]:
    return list(
        db.scalars(
            select(News.category)
            .where(News.status == NewsStatus.published, News.category.isnot(None))
            .distinct()
            .order_by(News.category)
        ).all()
    )


def list_featured(db: Session, *, limit: int = 5) -> list[News]:
    """Items du carrousel d'accueil : les actualités épinglées (is_featured)
    d'abord, triées par position, puis complétées par les plus récentes
    non-épinglées jusqu'à `limit` — jamais vide tant qu'il existe des
    actualités publiées."""
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


def create_news(db: Session, payload: NewsCreate) -> News:
    item = News(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_news(db: Session, item: News, payload: NewsUpdate) -> News:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


def increment_views(db: Session, item: News) -> News:
    item.views += 1
    db.commit()
    db.refresh(item)
    return item


def set_cover_url(db: Session, item: News, cover_image_url: str | None) -> News:
    item.cover_image_url = cover_image_url
    db.commit()
    db.refresh(item)
    return item


def delete_news(db: Session, item: News) -> None:
    db.delete(item)
    db.commit()


def get_admin_stats(db: Session) -> NewsAdminStats:
    """Répartition par statut, nombre d'épinglées, total des vues et top 5 des plus lues."""
    status_map: dict[NewsStatus, int] = dict(
        db.execute(select(News.status, func.count(News.id)).group_by(News.status)).all()
    )
    featured_count = (
        db.scalar(select(func.count()).select_from(News).where(News.is_featured.is_(True)))
        or 0
    )
    total_views = db.scalar(select(func.coalesce(func.sum(News.views), 0))) or 0
    top_rows = db.scalars(select(News).order_by(News.views.desc()).limit(5)).all()

    return NewsAdminStats(
        published=status_map.get(NewsStatus.published, 0),
        draft=status_map.get(NewsStatus.draft, 0),
        archived=status_map.get(NewsStatus.archived, 0),
        featured_count=featured_count,
        total_views=total_views,
        top_news=[TopNewsItem(id=n.id, title=n.title, views=n.views) for n in top_rows],
    )
