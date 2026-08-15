from datetime import datetime, timezone

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.member import Member
from app.models.prayer_request import PrayerRequest, PrayerRequestStatus
from app.schemas.prayer_request import PrayerRequestAdminStats


def _scoped(query: Select, scope: set[int] | None) -> Select:
    """Restreint aux demandes des membres des églises du périmètre. `None`
    signifie « aucune restriction » (administrateur global)."""
    if scope is None:
        return query
    return query.join(Member, Member.id == PrayerRequest.member_id).where(
        Member.church_id.in_(scope)
    )


def get_request(db: Session, request_id: int) -> PrayerRequest | None:
    return db.get(PrayerRequest, request_id)


def is_in_scope(db: Session, request: PrayerRequest, scope: set[int] | None) -> bool:
    """Vrai si la demande relève du périmètre donné."""
    if scope is None:
        return True
    member = request.member or db.get(Member, request.member_id)
    return member is not None and member.church_id in scope


def create_request(db: Session, *, member_id: int, message: str) -> PrayerRequest:
    request = PrayerRequest(member_id=member_id, message=message)
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def list_for_member(db: Session, member_id: int) -> list[PrayerRequest]:
    return list(
        db.scalars(
            select(PrayerRequest)
            .where(PrayerRequest.member_id == member_id)
            .order_by(PrayerRequest.created_at.desc())
        ).all()
    )


def list_for_admin(
    db: Session, *, scope: set[int] | None, status: PrayerRequestStatus | None = None
) -> list[PrayerRequest]:
    query = _scoped(select(PrayerRequest), scope)
    if status:
        query = query.where(PrayerRequest.status == status)
    return list(db.scalars(query.order_by(PrayerRequest.created_at.desc())).all())


def set_status(
    db: Session, request: PrayerRequest, status: PrayerRequestStatus
) -> PrayerRequest:
    request.status = status
    db.commit()
    db.refresh(request)
    return request


def claim(db: Session, request: PrayerRequest, *, user_id: int) -> PrayerRequest:
    """S'assigner la demande. Se réassigner à soi-même est sans effet ; c'est à
    l'appelant de refuser le cas où elle appartient déjà à quelqu'un d'autre."""
    request.handled_by = user_id
    request.handled_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(request)
    return request


def get_admin_stats(db: Session, *, scope: set[int] | None) -> PrayerRequestAdminStats:
    """Répartition par statut, dans le périmètre donné."""
    query = _scoped(select(PrayerRequest.status, func.count(PrayerRequest.id)), scope)
    status_map: dict[PrayerRequestStatus, int] = dict(
        db.execute(query.group_by(PrayerRequest.status)).all()
    )
    new = status_map.get(PrayerRequestStatus.new, 0)
    handled = status_map.get(PrayerRequestStatus.handled, 0)
    return PrayerRequestAdminStats(new=new, handled=handled, total=new + handled)
