from typing import BinaryIO

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.leader import Leader
from app.schemas.leader import LeaderCreate, LeaderUpdate
from app.services import storage


def _photo_extension(filename: str | None, content_type: str | None) -> str:
    if filename and "." in filename:
        return filename.rsplit(".", 1)[-1].lower()
    if content_type and "/" in content_type:
        return content_type.split("/")[-1]
    return "jpg"


def _apply_filters(
    query,
    *,
    published_only: bool,
    role: str | None,
    district: str | None,
    church_id: int | None,
    q: str | None = None,
    is_published: bool | None = None,
):
    if published_only:
        query = query.where(Leader.is_published.is_(True))
    elif is_published is not None:
        query = query.where(Leader.is_published.is_(is_published))
    if role:
        query = query.where(Leader.role == role)
    if district:
        query = query.where(Leader.district == district)
    if church_id:
        query = query.where(Leader.church_id == church_id)
    if q:
        term = f"%{q}%"
        query = query.where(
            Leader.first_name.ilike(term)
            | Leader.last_name.ilike(term)
            | Leader.title.ilike(term)
        )
    return query


def create_leader(db: Session, payload: LeaderCreate) -> Leader:
    leader = Leader(**payload.model_dump())
    db.add(leader)
    db.commit()
    db.refresh(leader)
    return leader


def get_leader(db: Session, leader_id: int) -> Leader | None:
    return db.get(Leader, leader_id)


def list_leaders(
    db: Session,
    *,
    published_only: bool = True,
    role: str | None = None,
    district: str | None = None,
    church_id: int | None = None,
    q: str | None = None,
    is_published: bool | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Leader]:
    query = _apply_filters(
        select(Leader),
        published_only=published_only,
        role=role,
        district=district,
        church_id=church_id,
        q=q,
        is_published=is_published,
    )
    return list(
        db.scalars(
            query.order_by(Leader.order_index.asc(), Leader.last_name.asc())
            .offset(skip)
            .limit(limit)
        ).all()
    )


def count_leaders(
    db: Session,
    *,
    published_only: bool = True,
    role: str | None = None,
    district: str | None = None,
    church_id: int | None = None,
    q: str | None = None,
    is_published: bool | None = None,
) -> int:
    query = _apply_filters(
        select(func.count()).select_from(Leader),
        published_only=published_only,
        role=role,
        district=district,
        church_id=church_id,
        q=q,
        is_published=is_published,
    )
    return db.scalar(query) or 0


def update_leader(db: Session, leader: Leader, payload: LeaderUpdate) -> Leader:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(leader, key, value)
    db.commit()
    db.refresh(leader)
    return leader


def delete_leader(db: Session, leader: Leader) -> None:
    if leader.photo_key:
        storage.delete_file_quiet(leader.photo_key)
    db.delete(leader)
    db.commit()


def upload_photo(
    db: Session,
    leader: Leader,
    fileobj: BinaryIO,
    content_type: str | None,
    filename: str | None,
) -> Leader:
    """Téléverse (ou remplace) la photo de profil vers MinIO."""
    if leader.photo_key:
        storage.delete_file_quiet(leader.photo_key)
    ext = _photo_extension(filename, content_type)
    photo_key = f"leaders/{leader.id}/photo.{ext}"
    storage.upload_file(fileobj, photo_key, content_type)
    leader.photo_key = photo_key
    db.commit()
    db.refresh(leader)
    return leader
