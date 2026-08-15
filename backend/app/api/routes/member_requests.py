from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_member, get_current_user, require_permissions
from app.core.config import settings
from app.core.email import (
    EmailSender,
    get_email_sender,
    member_request_received,
    member_request_resolved,
)
from app.db.session import get_db
from app.models.member import Member
from app.models.member_request import MemberRequest, MemberRequestStatus
from app.models.user import User
from app.schemas.member_request import (
    MemberRequestAdminRead,
    MemberRequestAdminStats,
    MemberRequestCreate,
    MemberRequestRead,
    MemberRequestUpdate,
)
from app.services import member_request_service

router = APIRouter(prefix="/member-requests", tags=["demandes des membres"])
# Comme pour les demandes de prière : la permission peut être portée par un
# rôle scopé sur une église, le périmètre est appliqué via accessible_church_ids.
can_manage = Depends(require_permissions("member_request:manage"))


def _scope_of(user: User) -> set[int] | None:
    return user.accessible_church_ids("member_request:manage")


def _load(db: Session, request_id: int) -> MemberRequest:
    req = member_request_service.get_request(db, request_id)
    if req is None:
        raise HTTPException(404, "Demande introuvable")
    return req


def _assert_in_scope(db: Session, user: User, req: MemberRequest) -> None:
    """Un gestionnaire scopé ne traite que les demandes des membres de son
    église. Un admin global (scope None) passe toujours."""
    if not member_request_service.is_in_scope(db, req, _scope_of(user)):
        raise HTTPException(403, "Cette demande est hors de votre périmètre")


def _to_admin_read(req: MemberRequest) -> MemberRequestAdminRead:
    return MemberRequestAdminRead(
        id=req.id,
        member_id=req.member_id,
        request_type=req.request_type,
        message=req.message,
        status=req.status,
        admin_response=req.admin_response,
        created_at=req.created_at,
        resolved_at=req.resolved_at,
        member_name=req.member.full_name if req.member else "—",
        member_email=req.member.email if req.member else "—",
        handled_by=req.handled_by,
        handled_by_email=req.handler.email if req.handler else None,
    )


@router.post("", response_model=MemberRequestRead, status_code=201)
def create_member_request(
    payload: MemberRequestCreate,
    background: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    sender: Annotated[EmailSender, Depends(get_email_sender)],
    current_member: Annotated[Member, Depends(get_current_member)],
):
    """Crée une demande libre — réservé aux membres connectés."""
    req = member_request_service.create_request(
        db,
        member_id=current_member.id,
        request_type=payload.request_type,
        message=payload.message,
    )
    background.add_task(
        member_request_received,
        sender,
        settings.admin_email,
        current_member.full_name,
        req.request_type,
        req.message,
    )
    return req


@router.get("/me", response_model=list[MemberRequestRead])
def list_my_member_requests(
    db: Annotated[Session, Depends(get_db)],
    current_member: Annotated[Member, Depends(get_current_member)],
):
    """Demandes du membre connecté."""
    return member_request_service.list_for_member(db, current_member.id)


@router.get(
    "/admin", response_model=list[MemberRequestAdminRead], dependencies=[can_manage]
)
def list_member_requests_admin(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status: MemberRequestStatus | None = None,
    request_type: str | None = None,
):
    """Liste les demandes, filtrable par statut et par type. Un gestionnaire
    scopé ne voit que celles des membres de son église."""
    rows = member_request_service.list_for_admin(
        db, scope=_scope_of(current_user), status=status, request_type=request_type
    )
    return [_to_admin_read(r) for r in rows]


@router.get(
    "/admin/stats", response_model=MemberRequestAdminStats, dependencies=[can_manage]
)
def get_member_requests_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Répartition par statut, dans le périmètre de l'utilisateur."""
    return member_request_service.get_admin_stats(db, scope=_scope_of(current_user))


@router.patch(
    "/{request_id}", response_model=MemberRequestAdminRead, dependencies=[can_manage]
)
def update_member_request(
    request_id: int,
    payload: MemberRequestUpdate,
    background: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    sender: Annotated[EmailSender, Depends(get_email_sender)],
):
    """Change le statut d'une demande et y répond. Le passage à « résolue »
    horodate la résolution et prévient le membre par courriel."""
    req = _load(db, request_id)
    _assert_in_scope(db, current_user, req)

    req, newly_resolved = member_request_service.update_request(
        db, req, payload, handled_by=current_user.id
    )

    if newly_resolved and req.member:
        background.add_task(
            member_request_resolved,
            sender,
            req.member.email,
            req.member.full_name,
            req.request_type,
            req.admin_response,
        )
    return _to_admin_read(req)
