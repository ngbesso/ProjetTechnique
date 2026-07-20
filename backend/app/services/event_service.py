from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.event import (
    Event,
    EventRegistration,
    EventStatus,
    RegistrationStatus,
)
from app.schemas.event import EventCreate, EventStats, EventUpdate, StatusBreakdownItem, TopEventItem


def _apply_filters(
    query,
    *,
    published_only: bool,
    category: str | None,
    district: str | None,
    church_id: int | None,
    upcoming_only: bool,
    q: str | None = None,
    status: EventStatus | None = None,
):
    if published_only:
        query = query.where(Event.status == EventStatus.published)
    elif status is not None:
        query = query.where(Event.status == status)
    if category is not None:
        query = query.where(Event.category == category)
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
    category: str | None = None,
    district: str | None = None,
    church_id: int | None = None,
    upcoming_only: bool = True,
    q: str | None = None,
    status: EventStatus | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Event]:
    query = _apply_filters(
        select(Event),
        published_only=published_only,
        category=category,
        district=district,
        church_id=church_id,
        upcoming_only=upcoming_only,
        q=q,
        status=status,
    )
    return list(
        db.scalars(query.order_by(Event.date_start.asc()).offset(skip).limit(limit)).all()
    )


def count_events(
    db: Session,
    *,
    published_only: bool = True,
    category: str | None = None,
    district: str | None = None,
    church_id: int | None = None,
    upcoming_only: bool = True,
    q: str | None = None,
    status: EventStatus | None = None,
) -> int:
    query = _apply_filters(
        select(func.count()).select_from(Event),
        published_only=published_only,
        category=category,
        district=district,
        church_id=church_id,
        upcoming_only=upcoming_only,
        q=q,
        status=status,
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


def get_registration_by_member(db: Session, event_id: int, member_id: int) -> EventRegistration | None:
    return db.scalar(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            EventRegistration.member_id == member_id,
        )
    )


def get_registration_by_email(db: Session, event_id: int, email: str) -> EventRegistration | None:
    return db.scalar(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            func.lower(EventRegistration.email) == email.lower(),
        )
    )


def register(
    db: Session,
    event: Event,
    *,
    member_id: int | None,
    first_name: str,
    last_name: str,
    email: str,
) -> EventRegistration:
    """Inscrit un participant (membre ou invité), idempotent par courriel :
    réactive une inscription annulée au lieu d'en recréer une."""
    existing = get_registration_by_email(db, event.id, email)
    if existing is not None:
        existing.first_name = first_name
        existing.last_name = last_name
        existing.member_id = member_id
        if existing.status != RegistrationStatus.confirmed:
            existing.status = RegistrationStatus.confirmed
            existing.registered_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing

    registration = EventRegistration(
        event_id=event.id,
        member_id=member_id,
        first_name=first_name,
        last_name=last_name,
        email=email,
    )
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


def list_all_registrations(db: Session, event_id: int) -> list[EventRegistration]:
    """Toutes les inscriptions (confirmées et annulées), pour l'export CSV."""
    return list(
        db.scalars(
            select(EventRegistration)
            .where(EventRegistration.event_id == event_id)
            .order_by(EventRegistration.registered_at.asc())
        ).all()
    )


def get_admin_stats(db: Session) -> EventStats:
    """Top 5 des événements par nombre d'inscriptions confirmées, et répartition
    du nombre d'événements par statut."""
    top_rows = db.execute(
        select(
            Event.id,
            Event.title,
            Event.category,
            func.count(EventRegistration.id).label("cnt"),
        )
        .join(EventRegistration, EventRegistration.event_id == Event.id)
        .where(EventRegistration.status == RegistrationStatus.confirmed)
        .group_by(Event.id, Event.title, Event.category)
        .order_by(func.count(EventRegistration.id).desc())
        .limit(5)
    ).all()
    top_events = [
        TopEventItem(id=r.id, title=r.title, category=r.category, registered_count=r.cnt)
        for r in top_rows
    ]

    status_rows = db.execute(
        select(Event.status, func.count()).group_by(Event.status)
    ).all()
    counts_by_status = {s: 0 for s in EventStatus}
    for status_value, cnt in status_rows:
        counts_by_status[status_value] = cnt
    status_breakdown = [
        StatusBreakdownItem(status=s, count=c) for s, c in counts_by_status.items()
    ]

    return EventStats(top_events=top_events, status_breakdown=status_breakdown)
