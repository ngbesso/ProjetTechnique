from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_member, get_current_user, require_permissions
from app.core.config import settings
from app.core.email import (
    EmailSender,
    get_email_sender,
    volunteer_request_received,
    volunteer_request_reviewed,
)
from app.db.session import get_db
from app.models.event import Event
from app.models.member import Member
from app.models.user import User
from app.models.volunteer_request import VolunteerRequest, VolunteerRequestStatus
from app.schemas.volunteer_request import (
    VolunteerEventCount,
    VolunteerRequestAdminRead,
    VolunteerRequestAdminStats,
    VolunteerRequestCreate,
    VolunteerRequestRead,
    VolunteerRequestUpdate,
)
from app.services import event_service

router = APIRouter(prefix="/volunteer-requests", tags=["bénévolat"])
# Un organisateur détient volunteer:manage via un rôle porté sur son église, pas
# sur l'église mère : la vérification porte sur l'union des permissions, et le
# périmètre est ensuite restreint aux événements dont il est propriétaire.
can_manage = Depends(require_permissions("volunteer:manage"))


def _load(db: Session, request_id: int) -> VolunteerRequest:
    req = db.get(VolunteerRequest, request_id)
    if req is None:
        raise HTTPException(404, "Demande introuvable")
    return req


def _initial_status(db: Session, event: Event) -> VolunteerRequestStatus:
    """Approuve d'emblée si l'auto-approbation est active et qu'il reste de la
    place (capacité null = illimitée) ; sinon la demande reste en attente, ce
    qui constitue de fait une liste d'attente."""
    if not event.volunteer_auto_approve:
        return VolunteerRequestStatus.pending
    if event.volunteer_capacity is None:
        return VolunteerRequestStatus.approved
    approved = event_service.count_approved_volunteers(db, event.id)
    if approved < event.volunteer_capacity:
        return VolunteerRequestStatus.approved
    return VolunteerRequestStatus.pending


def _owned_event_ids(db: Session, user: User) -> list[int] | None:
    """Identifiants des événements que l'utilisateur peut gérer, ou None s'il
    a accès à tout (administrateur global)."""
    if not event_service.is_organisateur_only(user):
        return None
    return list(db.scalars(select(Event.id).where(Event.created_by == user.id)).all())


def _to_read(req: VolunteerRequest) -> VolunteerRequestRead:
    return VolunteerRequestRead(
        id=req.id,
        member_id=req.member_id,
        event_id=req.event_id,
        event_title=req.event.title if req.event else "—",
        message=req.message,
        status=req.status,
        created_at=req.created_at,
    )


def _to_admin_read(req: VolunteerRequest) -> VolunteerRequestAdminRead:
    return VolunteerRequestAdminRead(
        **_to_read(req).model_dump(),
        member_name=req.member.full_name if req.member else "—",
        member_email=req.member.email if req.member else "—",
    )


@router.post("", response_model=VolunteerRequestRead, status_code=201)
def create_volunteer_request(
    payload: VolunteerRequestCreate,
    background: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    sender: Annotated[EmailSender, Depends(get_email_sender)],
    current_member: Annotated[Member, Depends(get_current_member)],
):
    """Crée une demande de bénévolat pour un événement — réservé aux membres connectés."""
    event = db.get(Event, payload.event_id)
    if event is None:
        raise HTTPException(404, "Événement introuvable")

    req = VolunteerRequest(
        member_id=current_member.id,
        event_id=payload.event_id,
        message=payload.message,
        status=_initial_status(db, event),
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    background.add_task(
        volunteer_request_received,
        sender,
        settings.admin_email,
        current_member.full_name,
        event.title,
        req.message,
    )
    # Approbation automatique : le membre est prévenu immédiatement, sans
    # passer par une revue manuelle.
    if req.status == VolunteerRequestStatus.approved:
        background.add_task(
            volunteer_request_reviewed,
            sender,
            current_member.email,
            current_member.full_name,
            event.title,
            VolunteerRequestStatus.approved.value,
        )
    return _to_read(req)


@router.get("/me", response_model=list[VolunteerRequestRead])
def list_my_volunteer_requests(
    db: Annotated[Session, Depends(get_db)],
    current_member: Annotated[Member, Depends(get_current_member)],
):
    """Demandes de bénévolat du membre connecté."""
    rows = db.scalars(
        select(VolunteerRequest)
        .where(VolunteerRequest.member_id == current_member.id)
        .order_by(VolunteerRequest.created_at.desc())
    ).all()
    return [_to_read(r) for r in rows]


@router.get(
    "/admin", response_model=list[VolunteerRequestAdminRead], dependencies=[can_manage]
)
def list_volunteer_requests_admin(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status: VolunteerRequestStatus | None = None,
    event_id: int | None = None,
):
    """Liste les demandes de bénévolat, filtrable par statut et par événement.
    Un organisateur ne voit que celles des événements qu'il a créés."""
    query = select(VolunteerRequest)
    owned_ids = _owned_event_ids(db, current_user)
    if owned_ids is not None:
        query = query.where(VolunteerRequest.event_id.in_(owned_ids))
    if status:
        query = query.where(VolunteerRequest.status == status)
    if event_id:
        query = query.where(VolunteerRequest.event_id == event_id)
    rows = db.scalars(query.order_by(VolunteerRequest.created_at.desc())).all()
    return [_to_admin_read(r) for r in rows]


@router.get(
    "/admin/stats", response_model=VolunteerRequestAdminStats, dependencies=[can_manage]
)
def get_volunteer_requests_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Répartition par statut et top 5 événements par nombre de demandes —
    restreintes aux événements de l'organisateur, le cas échéant."""
    owned_ids = _owned_event_ids(db, current_user)
    scope = (
        [VolunteerRequest.event_id.in_(owned_ids)] if owned_ids is not None else []
    )
    status_rows = db.execute(
        select(VolunteerRequest.status, func.count(VolunteerRequest.id))
        .where(*scope)
        .group_by(VolunteerRequest.status)
    ).all()
    status_map: dict[VolunteerRequestStatus, int] = dict(status_rows)
    pending = status_map.get(VolunteerRequestStatus.pending, 0)
    approved = status_map.get(VolunteerRequestStatus.approved, 0)
    rejected = status_map.get(VolunteerRequestStatus.rejected, 0)

    event_rows = db.execute(
        select(Event.id, Event.title, func.count(VolunteerRequest.id))
        .join(VolunteerRequest, VolunteerRequest.event_id == Event.id)
        .where(*scope)
        .group_by(Event.id, Event.title)
        .order_by(func.count(VolunteerRequest.id).desc())
        .limit(5)
    ).all()

    return VolunteerRequestAdminStats(
        pending=pending,
        approved=approved,
        rejected=rejected,
        total=pending + approved + rejected,
        top_events_by_requests=[
            VolunteerEventCount(event_id=eid, event_title=title, count=c)
            for eid, title, c in event_rows
        ],
    )


@router.patch(
    "/{request_id}",
    response_model=VolunteerRequestAdminRead,
    dependencies=[can_manage],
)
def update_volunteer_request(
    request_id: int,
    payload: VolunteerRequestUpdate,
    background: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    sender: Annotated[EmailSender, Depends(get_email_sender)],
):
    """Approuve ou refuse une demande de bénévolat — envoie un courriel au membre.
    Un organisateur ne peut traiter que les demandes de ses propres événements."""
    req = _load(db, request_id)
    if req.event is not None:
        event_service.assert_owns_event(current_user, req.event)
    req.status = payload.status
    db.commit()
    db.refresh(req)

    if req.member and payload.status in (
        VolunteerRequestStatus.approved,
        VolunteerRequestStatus.rejected,
    ):
        background.add_task(
            volunteer_request_reviewed,
            sender,
            req.member.email,
            req.member.full_name,
            req.event.title if req.event else "",
            payload.status.value,
        )
    return _to_admin_read(req)
