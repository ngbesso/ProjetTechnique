from datetime import date

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.db.pagination import paginate
from app.models.sermon import Sermon, SermonFormat, SermonStatus
from app.schemas.sermon import SermonAdminStats, SermonUpdate, TopSermonItem


def _search(query: Select, term: str, *, include_description: bool) -> Select:
    """Recherche plein texte sur les colonnes visibles. La description n'entre
    dans le champ de recherche que côté public, où elle est affichée."""
    like = f"%{term}%"
    clause = Sermon.title.ilike(like) | Sermon.preacher.ilike(like) | Sermon.series.ilike(like)
    if include_description:
        clause = clause | Sermon.description.ilike(like)
    return query.where(clause)


def get_sermon(db: Session, sermon_id: int) -> Sermon | None:
    return db.get(Sermon, sermon_id)


def list_published(
    db: Session,
    *,
    q: str | None = None,
    series: str | None = None,
    format: SermonFormat | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Sermon], int]:
    query = select(Sermon).where(Sermon.status == SermonStatus.published)
    if q:
        query = _search(query, q, include_description=True)
    if series:
        query = query.where(Sermon.series == series)
    if format:
        query = query.where(Sermon.format == format)
    return paginate(db, query.order_by(Sermon.sermon_date.desc()), limit, offset)


def list_all(
    db: Session,
    *,
    q: str | None = None,
    status: SermonStatus | None = None,
    series: str | None = None,
    format: SermonFormat | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Sermon], int]:
    query = select(Sermon)
    if q:
        query = _search(query, q, include_description=False)
    if status:
        query = query.where(Sermon.status == status)
    if series:
        query = query.where(Sermon.series == series)
    if format:
        query = query.where(Sermon.format == format)
    return paginate(db, query.order_by(Sermon.created_at.desc()), limit, offset)


def list_series(db: Session) -> list[str]:
    """Noms de séries distincts, sermons publiés uniquement."""
    return list(
        db.scalars(
            select(Sermon.series)
            .where(Sermon.status == SermonStatus.published, Sermon.series.isnot(None))
            .distinct()
            .order_by(Sermon.series)
        ).all()
    )


def create_sermon(
    db: Session,
    *,
    title: str,
    preacher: str,
    sermon_date: date,
    description: str | None,
    series: str | None,
    format: SermonFormat,
    status: SermonStatus,
    uploaded_by: int,
) -> Sermon:
    """Crée le sermon sans sa clé de fichier : l'id doit exister pour composer
    celle-ci, d'où le flush plutôt qu'un commit (voir attach_media)."""
    sermon = Sermon(
        title=title,
        preacher=preacher,
        sermon_date=sermon_date,
        description=description,
        series=series,
        format=format,
        file_key="",
        status=status,
        uploaded_by=uploaded_by,
    )
    db.add(sermon)
    db.flush()
    return sermon


def attach_media(
    db: Session, sermon: Sermon, *, file_key: str, format: SermonFormat | None = None
) -> Sermon:
    """Rattache le fichier téléversé au sermon et valide la transaction."""
    sermon.file_key = file_key
    if format is not None:
        sermon.format = format
    db.commit()
    db.refresh(sermon)
    return sermon


def update_sermon(db: Session, sermon: Sermon, payload: SermonUpdate) -> Sermon:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(sermon, key, value)
    db.commit()
    db.refresh(sermon)
    return sermon


def increment_views(db: Session, sermon: Sermon) -> Sermon:
    sermon.views += 1
    db.commit()
    db.refresh(sermon)
    return sermon


def delete_sermon(db: Session, sermon: Sermon) -> None:
    db.delete(sermon)
    db.commit()


def get_admin_stats(db: Session) -> SermonAdminStats:
    """Publiés/brouillons, total des vues et top 5 des sermons les plus vus."""
    status_map: dict[SermonStatus, int] = dict(
        db.execute(select(Sermon.status, func.count(Sermon.id)).group_by(Sermon.status)).all()
    )
    total_views = db.scalar(select(func.coalesce(func.sum(Sermon.views), 0))) or 0
    top_rows = db.scalars(select(Sermon).order_by(Sermon.views.desc()).limit(5)).all()

    return SermonAdminStats(
        published=status_map.get(SermonStatus.published, 0),
        draft=status_map.get(SermonStatus.draft, 0),
        total_views=total_views,
        top_sermons=[
            TopSermonItem(id=s.id, title=s.title, preacher=s.preacher, views=s.views)
            for s in top_rows
        ],
    )
