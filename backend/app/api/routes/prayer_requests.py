from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_member, require_global_permission
from app.core.config import settings
from app.core.email import EmailSender, get_email_sender, prayer_request_received
from app.db.session import get_db
from app.models.member import Member
from app.models.prayer_request import PrayerRequest, PrayerRequestStatus
from app.schemas.prayer_request import (
    PrayerRequestAdminRead,
    PrayerRequestCreate,
    PrayerRequestRead,
    PrayerRequestUpdate,
)

router = APIRouter(prefix="/prayer-requests", tags=["prières"])
can_manage = Depends(require_global_permission("prayer:manage"))


def _load(db: Session, request_id: int) -> PrayerRequest:
    req = db.get(PrayerRequest, request_id)
    if req is None:
        raise HTTPException(404, "Demande introuvable")
    return req


def _to_admin_read(req: PrayerRequest) -> PrayerRequestAdminRead:
    return PrayerRequestAdminRead(
        id=req.id,
        member_id=req.member_id,
        message=req.message,
        status=req.status,
        created_at=req.created_at,
        member_name=req.member.full_name if req.member else "—",
        member_email=req.member.email if req.member else "—",
    )


@router.post("", response_model=PrayerRequestRead, status_code=201)
def create_prayer_request(
    payload: PrayerRequestCreate,
    background: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    sender: Annotated[EmailSender, Depends(get_email_sender)],
    current_member: Annotated[Member, Depends(get_current_member)],
):
    """Crée une demande de prière — réservé aux membres connectés."""
    req = PrayerRequest(member_id=current_member.id, message=payload.message)
    db.add(req)
    db.commit()
    db.refresh(req)

    background.add_task(
        prayer_request_received,
        sender,
        settings.admin_email,
        current_member.full_name,
        req.message,
    )
    return req


@router.get("/me", response_model=list[PrayerRequestRead])
def list_my_prayer_requests(
    db: Annotated[Session, Depends(get_db)],
    current_member: Annotated[Member, Depends(get_current_member)],
):
    """Demandes de prière du membre connecté."""
    rows = db.scalars(
        select(PrayerRequest)
        .where(PrayerRequest.member_id == current_member.id)
        .order_by(PrayerRequest.created_at.desc())
    ).all()
    return list(rows)


@router.get(
    "/admin", response_model=list[PrayerRequestAdminRead], dependencies=[can_manage]
)
def list_prayer_requests_admin(
    db: Annotated[Session, Depends(get_db)],
    status: PrayerRequestStatus | None = None,
):
    """Liste toutes les demandes de prière, filtrable par statut — réservé aux gestionnaires."""
    query = select(PrayerRequest)
    if status:
        query = query.where(PrayerRequest.status == status)
    rows = db.scalars(query.order_by(PrayerRequest.created_at.desc())).all()
    return [_to_admin_read(r) for r in rows]


@router.patch(
    "/{request_id}",
    response_model=PrayerRequestAdminRead,
    dependencies=[can_manage],
)
def update_prayer_request(
    request_id: int,
    payload: PrayerRequestUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    """Change le statut d'une demande de prière (ex. marquer traitée) — réservé aux gestionnaires."""
    req = _load(db, request_id)
    req.status = payload.status
    db.commit()
    db.refresh(req)
    return _to_admin_read(req)
