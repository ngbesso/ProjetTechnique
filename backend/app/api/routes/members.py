from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.email import (
    EmailSender,
    get_email_sender,
    membership_approved,
    membership_received,
)
from app.db.session import get_db
from app.models.church import Church
from app.models.member import Member, MemberStatus
from app.models.user import User
from app.schemas.member import (
    MemberCreate,
    MemberList,
    MemberRead,
    MembershipRequest,
    MemberUpdate,
)

router = APIRouter(prefix="/members", tags=["membres"])


def _load(db: Session, member_id: int) -> Member:
    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(404, "Membre introuvable")
    return member


def _ensure(user: User, member: Member, code: str) -> None:
    if not user.has_permission(code, member.church_id):
        raise HTTPException(403, "Permission insuffisante sur cette église")


@router.post("/request", response_model=MemberRead, status_code=201)
def request_membership(
    data: MembershipRequest,
    background: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    sender: Annotated[EmailSender, Depends(get_email_sender)],
):
    if not db.get(Church, data.church_id):
        raise HTTPException(404, "Église introuvable")
    member = Member(**data.model_dump(), status=MemberStatus.pending)
    db.add(member)
    db.commit()
    db.refresh(member)
    background.add_task(membership_received, sender, member.email, member.first_name)
    return member


@router.get("/me", response_model=MemberRead)
def my_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = db.scalar(select(Member).where(Member.user_id == current_user.id))
    if not member:
        raise HTTPException(404, "Aucun profil de membre associé")
    return member


@router.get("", response_model=MemberList)
def list_members(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    status: MemberStatus | None = None,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
):
    scope = current_user.accessible_church_ids("member:read")
    if scope is not None and not scope:
        raise HTTPException(403, "Aucun périmètre accessible")
    query = select(Member)
    if scope is not None:
        query = query.where(Member.church_id.in_(scope))
    if q:
        like = f"%{q}%"
        query = query.where(
            or_(
                Member.first_name.ilike(like),
                Member.last_name.ilike(like),
                Member.email.ilike(like),
            )
        )
    if status:
        query = query.where(Member.status == status)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(
        query.order_by(Member.created_at.desc()).limit(limit).offset(offset)
    ).all()
    return MemberList(
        items=[MemberRead.model_validate(m) for m in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=MemberRead, status_code=201)
def create_member(
    data: MemberCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if not current_user.has_permission("member:create", data.church_id):
        raise HTTPException(403, "Permission insuffisante sur cette église")
    if not db.get(Church, data.church_id):
        raise HTTPException(404, "Église introuvable")
    member = Member(**data.model_dump(), status=MemberStatus.active)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.get("/{member_id}", response_model=MemberRead)
def get_member(
    member_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = _load(db, member_id)
    _ensure(current_user, member, "member:read")
    return member


@router.patch("/{member_id}", response_model=MemberRead)
def update_member(
    member_id: int,
    data: MemberUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = _load(db, member_id)
    _ensure(current_user, member, "member:update")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(member, k, v)
    db.commit()
    db.refresh(member)
    return member


@router.post("/{member_id}/approve", response_model=MemberRead)
def approve_member(
    member_id: int,
    background: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    sender: Annotated[EmailSender, Depends(get_email_sender)],
):
    member = _load(db, member_id)
    _ensure(current_user, member, "member:approve")
    member.status = MemberStatus.active
    db.commit()
    db.refresh(member)
    background.add_task(membership_approved, sender, member.email, member.first_name)
    return member


@router.post("/{member_id}/reject", response_model=MemberRead)
def reject_member(
    member_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = _load(db, member_id)
    _ensure(current_user, member, "member:approve")
    member.status = MemberStatus.rejected
    db.commit()
    db.refresh(member)
    return member


@router.post("/{member_id}/deactivate", response_model=MemberRead)
def deactivate_member(
    member_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = _load(db, member_id)
    _ensure(current_user, member, "member:update")
    member.status = MemberStatus.inactive
    db.commit()
    db.refresh(member)
    return member
