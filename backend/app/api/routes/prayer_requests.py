from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_member, get_current_user, require_permissions
from app.core.config import settings
from app.core.email import (
    EmailSender,
    get_email_sender,
    prayer_request_handled,
    prayer_request_received,
)
from app.db.session import get_db
from app.models.member import Member
from app.models.prayer_request import PrayerRequest, PrayerRequestStatus
from app.models.user import User
from app.schemas.prayer_request import (
    PrayerRequestAdminRead,
    PrayerRequestAdminStats,
    PrayerRequestCreate,
    PrayerRequestRead,
    PrayerRequestUpdate,
)
from app.services import prayer_request_service

router = APIRouter(prefix="/prayer-requests", tags=["prières"])
# Une équipe pastorale locale détient prayer:manage via un rôle porté sur son
# église (pas sur l'église mère) : la vérification porte sur l'union des
# permissions, et le périmètre est appliqué ensuite via accessible_church_ids.
can_manage = Depends(require_permissions("prayer:manage"))


def _scope_of(user: User) -> set[int] | None:
    return user.accessible_church_ids("prayer:manage")


def _load(db: Session, request_id: int) -> PrayerRequest:
    req = prayer_request_service.get_request(db, request_id)
    if req is None:
        raise HTTPException(404, "Demande introuvable")
    return req


def _assert_in_scope(db: Session, user: User, req: PrayerRequest) -> None:
    """Une équipe pastorale scopée ne peut traiter que les demandes des membres
    de son église. Un admin global (scope None) passe toujours."""
    if not prayer_request_service.is_in_scope(db, req, _scope_of(user)):
        raise HTTPException(403, "Cette demande est hors de votre périmètre")


def _to_admin_read(req: PrayerRequest) -> PrayerRequestAdminRead:
    return PrayerRequestAdminRead(
        id=req.id,
        member_id=req.member_id,
        message=req.message,
        status=req.status,
        created_at=req.created_at,
        member_name=req.member.full_name if req.member else "—",
        member_email=req.member.email if req.member else "—",
        handled_by=req.handled_by,
        handled_by_email=req.handler.email if req.handler else None,
        handled_at=req.handled_at,
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
    req = prayer_request_service.create_request(
        db, member_id=current_member.id, message=payload.message
    )
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
    return prayer_request_service.list_for_member(db, current_member.id)


@router.get(
    "/admin", response_model=list[PrayerRequestAdminRead], dependencies=[can_manage]
)
def list_prayer_requests_admin(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status: PrayerRequestStatus | None = None,
):
    """Liste les demandes de prière, filtrable par statut. Une équipe pastorale
    scopée ne voit que les demandes des membres de son église ; un admin global
    voit tout."""
    rows = prayer_request_service.list_for_admin(
        db, scope=_scope_of(current_user), status=status
    )
    return [_to_admin_read(r) for r in rows]


@router.get(
    "/admin/stats", response_model=PrayerRequestAdminStats, dependencies=[can_manage]
)
def get_prayer_requests_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Répartition des demandes de prière par statut, dans le périmètre de
    l'utilisateur."""
    return prayer_request_service.get_admin_stats(db, scope=_scope_of(current_user))


@router.patch(
    "/{request_id}",
    response_model=PrayerRequestAdminRead,
    dependencies=[can_manage],
)
def update_prayer_request(
    request_id: int,
    payload: PrayerRequestUpdate,
    background: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    sender: Annotated[EmailSender, Depends(get_email_sender)],
):
    """Change le statut d'une demande de prière (ex. marquer traitée) — réservé
    aux gestionnaires, dans leur périmètre. Envoie un courriel au membre
    lorsqu'elle est marquée traitée."""
    req = _load(db, request_id)
    _assert_in_scope(db, current_user, req)
    req = prayer_request_service.set_status(db, req, payload.status)

    if req.member and payload.status == PrayerRequestStatus.handled:
        background.add_task(
            prayer_request_handled,
            sender,
            req.member.email,
            req.member.full_name,
        )
    return _to_admin_read(req)


@router.post(
    "/{request_id}/claim",
    response_model=PrayerRequestAdminRead,
    dependencies=[can_manage],
)
def claim_prayer_request(
    request_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """S'assigner une demande de prière. Refuse (409) si elle est déjà prise en
    charge par quelqu'un d'autre ; se réassigner à soi-même est sans effet."""
    req = _load(db, request_id)
    _assert_in_scope(db, current_user, req)

    if req.handled_by is not None and req.handled_by != current_user.id:
        raise HTTPException(409, "Cette demande est déjà prise en charge")

    return _to_admin_read(
        prayer_request_service.claim(db, req, user_id=current_user.id)
    )
