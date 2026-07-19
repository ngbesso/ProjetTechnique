from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_member, require_global_permission
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
from app.models.volunteer_request import VolunteerRequest, VolunteerRequestStatus
from app.schemas.volunteer_request import (
    VolunteerRequestAdminRead,
    VolunteerRequestCreate,
    VolunteerRequestRead,
    VolunteerRequestUpdate,
)

router = APIRouter(prefix="/volunteer-requests", tags=["bénévolat"])
can_manage = Depends(require_global_permission("volunteer:manage"))


def _load(db: Session, request_id: int) -> VolunteerRequest:
    req = db.get(VolunteerRequest, request_id)
    if req is None:
        raise HTTPException(404, "Demande introuvable")
    return req


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
    status: VolunteerRequestStatus | None = None,
    event_id: int | None = None,
):
    """Liste toutes les demandes de bénévolat, filtrable par statut et par événement."""
    query = select(VolunteerRequest)
    if status:
        query = query.where(VolunteerRequest.status == status)
    if event_id:
        query = query.where(VolunteerRequest.event_id == event_id)
    rows = db.scalars(query.order_by(VolunteerRequest.created_at.desc())).all()
    return [_to_admin_read(r) for r in rows]


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
    sender: Annotated[EmailSender, Depends(get_email_sender)],
):
    """Approuve ou refuse une demande de bénévolat — envoie un courriel au membre."""
    req = _load(db, request_id)
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
