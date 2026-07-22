import csv
import io
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_member,
    get_current_member_optional,
    get_current_user,
    require_global_permission,
)
from app.core.config import settings
from app.core.email import EmailSender, event_registration_received, get_email_sender, render_event_message
from app.core.security import create_cancel_registration_token, decode_cancel_registration_token
from app.db.session import get_db
from app.models.event import Event, EventFormat, EventRegistration, EventStatus, RegistrationStatus
from app.models.member import Member
from app.models.user import User
from app.schemas.event import (
    EventCreate,
    EventList,
    EventRead,
    EventStats,
    EventSummary,
    EventUpdate,
    MyEventRegistration,
    RegistrationCreate,
    RegistrationRead,
    ResendCancelLinkRequest,
)
from app.services import event_service, storage

router = APIRouter(prefix="/api/events", tags=["événements"])
can_manage = Depends(require_global_permission("event:manage"))

MONTHS_FR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]


def _format_date_fr(d: datetime) -> str:
    return f"{d.day} {MONTHS_FR[d.month - 1]} {d.year}"


def _format_price(price: float | None) -> str | None:
    if price is None:
        return None
    return "Gratuit" if float(price) == 0 else f"{float(price):.2f} $ CAD"


def _load(db: Session, event_id: int) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Événement introuvable")
    return event


def _load_published(db: Session, event_id: int) -> Event:
    """Un événement non publié se comporte comme inexistant pour le public."""
    event = _load(db, event_id)
    if event.status != EventStatus.published:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Événement introuvable")
    return event


_DEFAULT_CANCEL_DEADLINE_HOURS = 24


def _cancel_deadline_hours(event: Event) -> int:
    return event.cancel_deadline_hours if event.cancel_deadline_hours is not None else _DEFAULT_CANCEL_DEADLINE_HOURS


def _assert_cancel_deadline_not_passed(event: Event) -> None:
    hours = _cancel_deadline_hours(event)
    if event.date_start - datetime.now(timezone.utc) < timedelta(hours=hours):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Le délai pour se désinscrire est dépassé"
        )


def _is_organisateur_only(user: User) -> bool:
    """Vrai si l'utilisateur détient le rôle « organisateur » et n'est pas
    administrateur global — il doit alors être restreint à ses propres
    événements (event.created_by)."""
    if user.has_global_permission("*"):
        return False
    return any(a.role.name == "organisateur" for a in user.role_assignments)


def _assert_owns_event(user: User, event: Event) -> None:
    if _is_organisateur_only(user) and event.created_by != user.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Vous ne pouvez gérer que les événements que vous avez créés",
        )


def _send_registration_confirmation(
    background: BackgroundTasks,
    sender: EmailSender,
    event: Event,
    registration: EventRegistration,
) -> None:
    """Envoie (ou renvoie) le courriel de confirmation d'inscription, avec un
    lien d'annulation fraîchement signé."""
    cancel_token = create_cancel_registration_token(registration.id, expires_at=event.date_start)
    cancel_link = f"{settings.frontend_url}/evenements/{event.id}?cancel_token={cancel_token}"
    online_link = (
        event.online_link if event.format in (EventFormat.en_ligne, EventFormat.hybride) else None
    )
    custom_message = (
        render_event_message(
            event.confirmation_message,
            prenom=registration.first_name,
            titre=event.title,
            date=_format_date_fr(event.date_start),
            delai=_cancel_deadline_hours(event),
        )
        if event.confirmation_message
        else None
    )
    background.add_task(
        event_registration_received,
        sender,
        registration.email,
        registration.first_name,
        event.title,
        _format_date_fr(event.date_start),
        event.location,
        event.instructor,
        _format_price(event.price),
        cancel_link,
        online_link,
        custom_message,
    )


def _image_extension(filename: str | None, content_type: str | None) -> str:
    if filename and "." in filename:
        return filename.rsplit(".", 1)[-1].lower()
    if content_type and "/" in content_type:
        return content_type.split("/")[-1]
    return "jpg"


def _to_read(db: Session, event: Event, *, reveal_online_link: bool = True) -> EventRead:
    registered = event_service.count_confirmed(db, event.id)
    spots_left = (
        max(event.capacity - registered, 0)
        if event.capacity is not None
        else None
    )
    image_url = storage.presigned_url(event.image_key, expires=3600) if event.image_key else None
    return EventRead(
        id=event.id,
        title=event.title,
        description=event.description,
        category=event.category,
        date_start=event.date_start,
        date_end=event.date_end,
        location=event.location,
        instructor=event.instructor,
        intervenant_category=event.intervenant_category,
        price=event.price,
        zeffy_form_path=event.zeffy_form_path,
        church_id=event.church_id,
        district=event.district,
        capacity=event.capacity,
        show_registration_count=event.show_registration_count,
        status=event.status,
        format=event.format,
        online_link=event.online_link if reveal_online_link else None,
        cancel_deadline_hours=event.cancel_deadline_hours,
        confirmation_message=event.confirmation_message,
        reminder_message=event.reminder_message,
        created_by=event.created_by,
        created_at=event.created_at,
        updated_at=event.updated_at,
        registered_count=registered,
        spots_left=spots_left,
        image_url=image_url,
    )


def _to_registration_read(
    registration: EventRegistration, event: Event | None = None
) -> RegistrationRead:
    online_link = (
        event.online_link
        if event is not None and event.format in (EventFormat.en_ligne, EventFormat.hybride)
        else None
    )
    return RegistrationRead(
        id=registration.id,
        event_id=registration.event_id,
        member_id=registration.member_id,
        first_name=registration.first_name,
        last_name=registration.last_name,
        email=registration.email,
        registered_at=registration.registered_at,
        status=registration.status,
        online_link=online_link,
    )


@router.get("/", response_model=EventList)
def list_events(
    db: Annotated[Session, Depends(get_db)],
    category: str | None = None,
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
        category=category,
        district=district,
        church_id=church_id,
        upcoming_only=upcoming_only,
        skip=offset,
        limit=limit,
    )
    total = event_service.count_events(
        db,
        published_only=True,
        category=category,
        district=district,
        church_id=church_id,
        upcoming_only=upcoming_only,
    )
    return EventList(
        items=[_to_read(db, e, reveal_online_link=False) for e in events],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/admin", response_model=EventList, dependencies=[can_manage])
def list_events_admin(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    q: str | None = None,
    category: str | None = None,
    district: str | None = None,
    church_id: int | None = None,
    event_status: EventStatus | None = None,
    upcoming_only: bool = False,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Liste tous les événements (brouillons compris) — réservé aux gestionnaires.
    Un organisateur (non admin global) ne voit que les événements qu'il a créés."""
    created_by = current_user.id if _is_organisateur_only(current_user) else None
    events = event_service.list_events(
        db,
        published_only=False,
        category=category,
        district=district,
        church_id=church_id,
        upcoming_only=upcoming_only,
        q=q,
        status=event_status,
        created_by=created_by,
        skip=offset,
        limit=limit,
    )
    total = event_service.count_events(
        db,
        published_only=False,
        category=category,
        district=district,
        church_id=church_id,
        upcoming_only=upcoming_only,
        q=q,
        status=event_status,
        created_by=created_by,
    )
    return EventList(
        items=[_to_read(db, e) for e in events], total=total, limit=limit, offset=offset
    )


@router.get("/admin/stats", response_model=EventStats, dependencies=[can_manage])
def get_events_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Statistiques admin : top 5 des événements par inscriptions et répartition par statut.
    Restreintes aux événements créés par l'organisateur, le cas échéant."""
    created_by = current_user.id if _is_organisateur_only(current_user) else None
    return event_service.get_admin_stats(db, created_by=created_by)


@router.get("/registrations/me", response_model=list[MyEventRegistration])
def list_my_registrations(
    db: Annotated[Session, Depends(get_db)],
    current_member: Annotated[Member, Depends(get_current_member)],
):
    """Inscriptions confirmées du membre connecté, événement joint.

    Appariées par member_id (inscriptions liées au compte) ou par courriel
    (inscriptions faites en invité avant la création du compte, ou héritées
    de l'ancien module Formations).
    """
    rows = db.execute(
        select(EventRegistration, Event)
        .join(Event, Event.id == EventRegistration.event_id)
        .where(
            (EventRegistration.member_id == current_member.id)
            | (func.lower(EventRegistration.email) == current_member.email.lower()),
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
    return _to_read(db, event, reveal_online_link=False)


@router.post(
    "/", response_model=EventRead, status_code=status.HTTP_201_CREATED, dependencies=[can_manage]
)
def create_event(
    payload: EventCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Crée un événement — réservé aux gestionnaires (permission event:manage)."""
    event = event_service.create_event(db, payload, created_by=current_user.id)
    return _to_read(db, event)


@router.put("/{event_id}", response_model=EventRead, dependencies=[can_manage])
def update_event(
    event_id: int,
    payload: EventUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Modifie un événement — réservé aux gestionnaires (un organisateur ne peut
    modifier que les événements qu'il a créés)."""
    event = _load(db, event_id)
    _assert_owns_event(current_user, event)
    event = event_service.update_event(db, event, payload)
    return _to_read(db, event)


@router.delete(
    "/{event_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[can_manage]
)
def delete_event(
    event_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Supprime un événement — réservé aux administrateurs (un organisateur ne
    peut supprimer que les événements qu'il a créés)."""
    event = _load(db, event_id)
    _assert_owns_event(current_user, event)
    event_service.delete_event(db, event)


@router.post(
    "/{event_id}/register",
    response_model=RegistrationRead,
    status_code=status.HTTP_201_CREATED,
)
def register_to_event(
    event_id: int,
    db: Annotated[Session, Depends(get_db)],
    background: BackgroundTasks,
    sender: Annotated[EmailSender, Depends(get_email_sender)],
    current_member: Annotated[Member | None, Depends(get_current_member_optional)],
    payload: RegistrationCreate = RegistrationCreate(),
):
    """Inscrit à l'événement. Aucun compte n'est requis : un membre connecté
    est auto-rempli et lié à partir de son profil, sinon nom/prénom/courriel
    sont requis dans le corps de la requête (inscription invité)."""
    event = _load_published(db, event_id)
    if event.date_start < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cet événement est déjà passé")
    if event.price and float(event.price) > 0:
        if not event.zeffy_form_path:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Le paiement pour cet événement n'est pas encore configuré",
            )
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Cet événement nécessite un paiement — utilisez le formulaire de paiement "
            "sur la page de l'événement",
        )

    if current_member is not None:
        member_id = current_member.id
        first_name = current_member.first_name
        last_name = current_member.last_name
        email = current_member.email
    else:
        if not payload.first_name or not payload.last_name or not payload.email:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Prénom, nom et courriel sont requis pour s'inscrire sans compte",
            )
        member_id = None
        first_name = payload.first_name
        last_name = payload.last_name
        email = payload.email

    existing = event_service.get_registration_by_email(db, event_id, email)
    already_confirmed = existing is not None and existing.status == RegistrationStatus.confirmed
    if not already_confirmed and event.capacity is not None:
        registered = event_service.count_confirmed(db, event_id)
        if registered >= event.capacity:
            raise HTTPException(status.HTTP_409_CONFLICT, "Cet événement est complet")

    registration = event_service.register(
        db, event, member_id=member_id, first_name=first_name, last_name=last_name, email=email
    )
    _send_registration_confirmation(background, sender, event, registration)
    return _to_registration_read(registration, event)


@router.post(
    "/{event_id}/registrations/resend-cancel-link",
    status_code=status.HTTP_204_NO_CONTENT,
)
def resend_cancel_link(
    event_id: int,
    payload: ResendCancelLinkRequest,
    db: Annotated[Session, Depends(get_db)],
    background: BackgroundTasks,
    sender: Annotated[EmailSender, Depends(get_email_sender)],
):
    """Renvoie le courriel de confirmation (avec un nouveau lien d'annulation) à un
    inscrit sans compte ayant perdu son courriel initial. Répond toujours 204,
    que le courriel corresponde ou non à une inscription confirmée pour cet
    événement, pour ne pas révéler si quelqu'un y est inscrit."""
    event = _load(db, event_id)
    registration = event_service.get_registration_by_email(db, event_id, payload.email)
    if registration is not None and registration.status == RegistrationStatus.confirmed:
        _send_registration_confirmation(background, sender, event, registration)


@router.delete("/{event_id}/register", status_code=status.HTTP_204_NO_CONTENT)
def cancel_my_registration(
    event_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_member: Annotated[Member, Depends(get_current_member)],
):
    """Annule l'inscription du membre connecté."""
    registration = event_service.get_registration_by_member(db, event_id, current_member.id)
    if registration is None or registration.status != RegistrationStatus.confirmed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inscription introuvable")
    event = _load(db, event_id)
    _assert_cancel_deadline_not_passed(event)
    event_service.cancel_registration(db, registration)


@router.delete("/registrations/cancel", status_code=status.HTTP_204_NO_CONTENT)
def cancel_registration_by_token(
    token: str,
    db: Annotated[Session, Depends(get_db)],
):
    """Annule une inscription faite sans compte, via le jeton envoyé par courriel
    à la confirmation d'inscription (mêmes règles de délai que l'annulation depuis
    l'espace membre)."""
    try:
        registration_id = decode_cancel_registration_token(token)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Lien invalide ou expiré")
    registration = db.get(EventRegistration, registration_id)
    if registration is None or registration.status != RegistrationStatus.confirmed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inscription introuvable")
    event = _load(db, registration.event_id)
    _assert_cancel_deadline_not_passed(event)
    event_service.cancel_registration(db, registration)


@router.get(
    "/{event_id}/participants",
    response_model=list[RegistrationRead],
    dependencies=[can_manage],
)
def list_participants(
    event_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Liste les participants inscrits — réservé aux gestionnaires."""
    event = _load(db, event_id)
    _assert_owns_event(current_user, event)
    registrations = event_service.list_registrations(db, event_id)
    return [_to_registration_read(r, event) for r in registrations]


@router.get("/{event_id}/registrations/export", dependencies=[can_manage])
def export_event_registrations(
    event_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Exporte les inscriptions (confirmées et annulées) au format CSV — réservé aux gestionnaires."""
    event = _load(db, event_id)
    _assert_owns_event(current_user, event)
    registrations = event_service.list_all_registrations(db, event_id)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Prénom", "Nom", "Courriel", "Statut", "Date d'inscription"])
    for r in registrations:
        writer.writerow([r.first_name, r.last_name, r.email, r.status.value, r.registered_at.isoformat()])
    content = buffer.getvalue().encode("utf-8-sig")

    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=inscriptions-evenement-{event.id}.csv"},
    )


@router.post("/{event_id}/image", response_model=EventRead, dependencies=[can_manage])
def upload_event_image(
    event_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    file: Annotated[UploadFile, File()],
):
    """Téléverse (ou remplace) l'image de couverture — réservé aux gestionnaires."""
    event = _load(db, event_id)
    _assert_owns_event(current_user, event)
    if event.image_key:
        try:
            storage.delete_file(event.image_key)
        except Exception:
            pass
    ext = _image_extension(file.filename, file.content_type)
    image_key = f"events/{event.id}/cover.{ext}"
    storage.upload_file(file.file, image_key, file.content_type)
    event.image_key = image_key
    db.commit()
    db.refresh(event)
    return _to_read(db, event)


@router.get("/{event_id}/image")
def get_event_image(event_id: int, db: Annotated[Session, Depends(get_db)]):
    """Retourne une URL présignée vers l'image de couverture (même logique que pour les sermons)."""
    event = _load(db, event_id)
    if not event.image_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aucune image associée à cet événement")
    url = storage.presigned_url(event.image_key, expires=300)
    return {"url": url}
