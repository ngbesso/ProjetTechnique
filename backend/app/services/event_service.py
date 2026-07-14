from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.event import Event, EventRegistration, RegistrationStatus
from app.schemas.event import EventCreate, EventUpdate


def _apply_filters(
    query,
    *,
    published_only: bool,
    district: str | None,
    church_id: int | None,
    upcoming_only: bool,
    q: str | None = None,
    is_published: bool | None = None,
):
    if published_only:
        query = query.where(Event.is_published.is_(True))
    elif is_published is not None:
        query = query.where(Event.is_published.is_(is_published))
    if district:
        query = query.where(Event.district == district)
    if church_id:
        query = query.where(Event.church_id == church_id)
    if upcoming_only:
        query = query.where(Event.date_start >= datetime.now(timezone.utc))
    if q:
        term = f"%{q}%"
        query = query.where(Event.title.ilike(term) | Event.location.ilike(term))
    return query


def create_event(db: Session, payload: EventCreate) -> Event:
    event = Event(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_event(db: Session, event_id: int) -> Event | None:
    return db.get(Event, event_id)


def list_events(
    db: Session,
    *,
    published_only: bool = True,
    district: str | None = None,
    church_id: int | None = None,
    upcoming_only: bool = True,
    q: str | None = None,
    is_published: bool | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Event]:
    query = _apply_filters(
        select(Event),
        published_only=published_only,
        district=district,
        church_id=church_id,
        upcoming_only=upcoming_only,
        q=q,
        is_published=is_published,
    )
    return list(
        db.scalars(query.order_by(Event.date_start.asc()).offset(skip).limit(limit)).all()
    )


def count_events(
    db: Session,
    *,
    published_only: bool = True,
    district: str | None = None,
    church_id: int | None = None,
    upcoming_only: bool = True,
    q: str | None = None,
    is_published: bool | None = None,
) -> int:
    query = _apply_filters(
        select(func.count()).select_from(Event),
        published_only=published_only,
        district=district,
        church_id=church_id,
        upcoming_only=upcoming_only,
        q=q,
        is_published=is_published,
    )
    return db.scalar(query) or 0


def update_event(db: Session, event: Event, payload: EventUpdate) -> Event:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event


def delete_event(db: Session, event: Event) -> None:
    db.delete(event)
    db.commit()


def count_confirmed(db: Session, event_id: int) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(EventRegistration)
            .where(
                EventRegistration.event_id == event_id,
                EventRegistration.status == RegistrationStatus.confirmed,
            )
        )
        or 0
    )


def get_registration(db: Session, event_id: int, member_id: int) -> EventRegistration | None:
    return db.scalar(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            EventRegistration.member_id == member_id,
        )
    )


def register_member(db: Session, event: Event, member_id: int) -> EventRegistration:
    """Inscrit le membre. Idempotent : réactive une inscription annulée au lieu d'en recréer une."""
    existing = get_registration(db, event.id, member_id)
    if existing is not None:
        if existing.status != RegistrationStatus.confirmed:
            existing.status = RegistrationStatus.confirmed
            existing.registered_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing)
        return existing

    registration = EventRegistration(event_id=event.id, member_id=member_id)
    db.add(registration)
    db.commit()
    db.refresh(registration)
    return registration


def cancel_registration(db: Session, registration: EventRegistration) -> EventRegistration:
    registration.status = RegistrationStatus.cancelled
    db.commit()
    db.refresh(registration)
    return registration


def list_registrations(db: Session, event_id: int) -> list[EventRegistration]:
    return list(
        db.scalars(
            select(EventRegistration)
            .where(
                EventRegistration.event_id == event_id,
                EventRegistration.status == RegistrationStatus.confirmed,
            )
            .order_by(EventRegistration.registered_at.asc())
        ).all()
    )
