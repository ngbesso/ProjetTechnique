from datetime import datetime, timezone

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.member import Member
from app.models.member_request import MemberRequest, MemberRequestStatus
from app.schemas.member_request import MemberRequestAdminStats, MemberRequestUpdate


def _scoped(query: Select, scope: set[int] | None) -> Select:
    """Restreint aux demandes des membres des églises du périmètre. `None`
    signifie « aucune restriction » (administrateur global)."""
    if scope is None:
        return query
    return query.join(Member, Member.id == MemberRequest.member_id).where(
        Member.church_id.in_(scope)
    )


def get_request(db: Session, request_id: int) -> MemberRequest | None:
    return db.get(MemberRequest, request_id)


def is_in_scope(db: Session, request: MemberRequest, scope: set[int] | None) -> bool:
    """Vrai si la demande relève du périmètre donné."""
    if scope is None:
        return True
    member = request.member or db.get(Member, request.member_id)
    return member is not None and member.church_id in scope


def create_request(
    db: Session, *, member_id: int, request_type: str, message: str
) -> MemberRequest:
    request = MemberRequest(
        member_id=member_id,
        request_type=request_type.strip(),
        message=message,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def list_for_member(db: Session, member_id: int) -> list[MemberRequest]:
    return list(
        db.scalars(
            select(MemberRequest)
            .where(MemberRequest.member_id == member_id)
            .order_by(MemberRequest.created_at.desc())
        ).all()
    )


def list_for_admin(
    db: Session,
    *,
    scope: set[int] | None,
    status: MemberRequestStatus | None = None,
    request_type: str | None = None,
) -> list[MemberRequest]:
    query = _scoped(select(MemberRequest), scope)
    if status:
        query = query.where(MemberRequest.status == status)
    if request_type:
        query = query.where(MemberRequest.request_type == request_type)
    return list(db.scalars(query.order_by(MemberRequest.created_at.desc())).all())


def update_request(
    db: Session, request: MemberRequest, payload: MemberRequestUpdate, *, handled_by: int
) -> tuple[MemberRequest, bool]:
    """Change le statut et la réponse. Retourne la demande et un drapeau
    indiquant si elle vient tout juste de passer à « résolue » — c'est ce
    passage, et lui seul, qui déclenche le courriel au membre."""
    was_resolved = request.status == MemberRequestStatus.resolved
    request.status = payload.status
    if payload.admin_response is not None:
        request.admin_response = payload.admin_response
    # Le gestionnaire qui traite la demande en devient le responsable.
    request.handled_by = handled_by

    newly_resolved = not was_resolved and payload.status == MemberRequestStatus.resolved
    if newly_resolved:
        request.resolved_at = datetime.now(timezone.utc)
    elif payload.status != MemberRequestStatus.resolved:
        request.resolved_at = None

    db.commit()
    db.refresh(request)
    return request, newly_resolved


def get_admin_stats(db: Session, *, scope: set[int] | None) -> MemberRequestAdminStats:
    """Répartition par statut, dans le périmètre donné."""
    query = _scoped(select(MemberRequest.status, func.count(MemberRequest.id)), scope)
    status_map: dict[MemberRequestStatus, int] = dict(
        db.execute(query.group_by(MemberRequest.status)).all()
    )
    new = status_map.get(MemberRequestStatus.new, 0)
    in_progress = status_map.get(MemberRequestStatus.in_progress, 0)
    resolved = status_map.get(MemberRequestStatus.resolved, 0)
    return MemberRequestAdminStats(
        new=new,
        in_progress=in_progress,
        resolved=resolved,
        total=new + in_progress + resolved,
    )
