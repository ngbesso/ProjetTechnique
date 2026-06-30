import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.sermon import Sermon, StatutSermon
from app.schemas.sermon import SermonCreate, SermonUpdate


def get_sermon(db: Session, sermon_id: uuid.UUID) -> Sermon | None:
    return db.get(Sermon, sermon_id)


def get_sermons(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    statut: StatutSermon = StatutSermon.PUBLIE,
) -> tuple[list[Sermon], int]:
    stmt = select(Sermon).where(Sermon.statut == statut).order_by(Sermon.date_sermon.desc())
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(stmt.offset(skip).limit(limit)).all()
    return list(items), total or 0


def create_sermon(
    db: Session,
    sermon_in: SermonCreate,
    uploaded_by: uuid.UUID | None = None,
) -> Sermon:
    sermon = Sermon(**sermon_in.model_dump(exclude_unset=False), uploaded_by=uploaded_by)
    db.add(sermon)
    db.commit()
    db.refresh(sermon)
    return sermon


def update_sermon(
    db: Session, sermon: Sermon, sermon_in: SermonUpdate
) -> Sermon:
    data = sermon_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(sermon, field, value)
    db.commit()
    db.refresh(sermon)
    return sermon


def archive_sermon(db: Session, sermon: Sermon) -> Sermon:
    sermon.statut = StatutSermon.ARCHIVE
    db.commit()
    db.refresh(sermon)
    return sermon


def increment_vues(db: Session, sermon: Sermon) -> None:
    sermon.vues += 1
    db.commit()
