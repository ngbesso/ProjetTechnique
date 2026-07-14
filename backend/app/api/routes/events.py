from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_member, require_global_permission
from app.db.session import get_db
from app.models.event import Event, EventRegistration, RegistrationStatus
from app.models.member import Member
from app.schemas.event import (
    EventCreate,
    EventList,
    EventRead,
    EventSummary,
    EventUpdate,
    MyEventRegistration,
    RegistrationCreate,
    RegistrationRead,
)
from app.services import event_service

router = APIRouter(prefix="/api/events", tags=["événements"])
can_manage = Depends(require_global_permission("event:manage"))


def _load(db: Session, event_id: int) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Événement introuvable")
    return event


def _load_published(db: Session, event_id: int) -> Event:
    """Un événement non publié se comporte comme inexistant pour le public."""
    event = _load(db, event_id)
    if not event.is_published:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Événement introuvable")
    return event


def _to_read(db: Session, event: Event) -> EventRead:
    registered = event_service.count_confirmed(db, event.id)
    spots_left = (
        max(event.max_participants - registered, 0)
        if event.max_participants is not None
        else None
    )
    return EventRead(
        id=event.id,
        title=event.title,
        description=event.description,
        date_start=event.date_start,
        date_end=event.date_end,
        location=event.location,
        church_id=event.church_id,
        district=event.district,
        max_participants=event.max_participants,
        is_published=event.is_published,
        created_at=event.created_at,
        updated_at=event.updated_at,
        registered_count=registered,
        spots_left=spots_left,
    )


def _to_registration_read(registration: EventRegistration, member: Member | None) -> RegistrationRead:
    return RegistrationRead(
        id=registration.id,
        event_id=registration.event_id,
        member_id=registration.member_id,
        registered_at=registration.registered_at,
        status=registration.status,
        member_name=member.full_name if member else None,
        member_email=member.email if member else None,
    )


@router.get("/", response_model=EventList)
def list_events(
    db: Annotated[Session, Depends(get_db)],
    district: str | None = None,
    church_id: int | None = None,
    upcoming_only: bool = True,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Liste publique des événements publiés (à venir par défaut)."""
    events = event_service.list_events(
        db,
        published_only=True,
        district=district,
        church_id=church_id,
        upcoming_only=upcoming_only,
        skip=offset,
        limit=limit,
    )
    total = event_service.count_events(
        db,
        published_only=True,
        district=district,
        church_id=church_id,
        upcoming_only=upcoming_only,
    )
    return EventList(
        items=[_to_read(db, e) for e in events], total=total, limit=limit, offset=offset
    )


@router.get("/admin", response_model=EventList, dependencies=[can_manage])
def list_events_admin(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    district: str | None = None,
    church_id: int | None = None,
    is_published: bool | None = None,
    upcoming_only: bool = False,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Liste tous les événements (brouillons compris) — réservé aux gestionnaires."""
    events = event_service.list_events(
        db,
        published_only=False,
        district=district,
        church_id=church_id,
        upcoming_only=upcoming_only,
        q=q,
        is_published=is_published,
        skip=offset,
        limit=limit,
    )
    total = event_service.count_events(
        db,
        published_only=False,
        district=district,
        church_id=church_id,
        upcoming_only=upcoming_only,
        q=q,
        is_published=is_published,
    )
    return EventList(
        items=[_to_read(db, e) for e in events], total=total, limit=limit, offset=offset
    )


@router.get("/registrations/me", response_model=list[MyEventRegistration])
def list_my_registrations(
    db: Annotated[Session, Depends(get_db)],
    current_member: Annotated[Member, Depends(get_current_member)],
):
    """Inscriptions confirmées du membre connecté, événement joint."""
    rows = db.execute(
        select(EventRegistration, Event)
        .join(Event, Event.id == EventRegistration.event_id)
        .where(
            EventRegistration.member_id == current_member.id,
            EventRegistration.status == RegistrationStatus.confirmed,
        )
        .order_by(Event.date_start.desc())
    ).all()
    return [
        MyEventRegistration(
            id=reg.id,
            event_id=reg.event_id,
            registered_at=reg.registered_at,
            event=EventSummary.model_validate(event),
        )
        for reg, event in rows
    ]


@router.get("/{event_id}", response_model=EventRead)
def get_event(event_id: int, db: Annotated[Session, Depends(get_db)]):
    """Détail public d'un événement publié."""
    event = _load_published(db, event_id)
    return _to_read(db, event)


@router.post(
    "/", response_model=EventRead, status_code=status.HTTP_201_CREATED, dependencies=[can_manage]
)
def create_event(payload: EventCreate, db: Annotated[Session, Depends(get_db)]):
    """Crée un événement — réservé aux gestionnaires (permission event:manage)."""
    event = event_service.create_event(db, payload)
    return _to_read(db, event)


@router.put("/{event_id}", response_model=EventRead, dependencies=[can_manage])
def update_event(
    event_id: int, payload: EventUpdate, db: Annotated[Session, Depends(get_db)]
):
    """Modifie un événement — réservé aux gestionnaires."""
    event = _load(db, event_id)
    event = event_service.update_event(db, event, payload)
    return _to_read(db, event)


@router.delete(
    "/{event_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[can_manage]
)
def delete_event(event_id: int, db: Annotated[Session, Depends(get_db)]):
    """Supprime un événement — réservé aux administrateurs."""
    event = _load(db, event_id)
    event_service.delete_event(db, event)


@router.post(
    "/{event_id}/register",
    response_model=RegistrationRead,
    status_code=status.HTTP_201_CREATED,
)
def register_to_event(
    event_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_member: Annotated[Member, Depends(get_current_member)],
    payload: RegistrationCreate = RegistrationCreate(),
):
    """Inscrit le membre connecté à l'événement (idempotent si déjà inscrit)."""
    event = _load_published(db, event_id)
    if event.date_start < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cet événement est déjà passé")

    existing = event_service.get_registration(db, event_id, current_member.id)
    already_confirmed = existing is not None and existing.status == RegistrationStatus.confirmed
    if not already_confirmed and event.max_participants is not None:
        registered = event_service.count_confirmed(db, event_id)
        if registered >= event.max_participants:
            raise HTTPException(status.HTTP_409_CONFLICT, "Cet événement est complet")

    registration = event_service.register_member(db, event, current_member.id)
    return _to_registration_read(registration, current_member)


@router.delete("/{event_id}/register", status_code=status.HTTP_204_NO_CONTENT)
def cancel_my_registration(
    event_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_member: Annotated[Member, Depends(get_current_member)],
):
    """Annule l'inscription du membre connecté."""
    registration = event_service.get_registration(db, event_id, current_member.id)
    if registration is None or registration.status != RegistrationStatus.confirmed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inscription introuvable")
    event_service.cancel_registration(db, registration)


@router.get(
    "/{event_id}/participants",
    response_model=list[RegistrationRead],
    dependencies=[can_manage],
)
def list_participants(event_id: int, db: Annotated[Session, Depends(get_db)]):
    """Liste les participants inscrits — réservé aux gestionnaires."""
    _load(db, event_id)
    registrations = event_service.list_registrations(db, event_id)
    return [_to_registration_read(r, r.member) for r in registrations]
