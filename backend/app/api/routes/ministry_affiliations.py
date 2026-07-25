from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_member, get_current_user
from app.db.session import get_db
from app.models.member import Member
from app.models.ministry_affiliation import MemberMinistryAffiliation
from app.models.user import User
from app.schemas.ministry_affiliation import (
    MinistryAffiliationCreate,
    MinistryAffiliationRead,
    MinistryBulkAddRequest,
    MinistryBulkAddResult,
    MinistryMemberRead,
)

router = APIRouter(tags=["ministères"])


def _today():
    return datetime.now(timezone.utc).date()


# ── Libre-service (membre connecté) — auto-affiliation, sans approbation ─────


@router.post("/members/me/ministries", response_model=MinistryAffiliationRead, status_code=201)
def join_ministry(
    data: MinistryAffiliationCreate,
    member: Annotated[Member, Depends(get_current_member)],
    db: Annotated[Session, Depends(get_db)],
):
    ministry = data.ministry.strip()
    if not ministry:
        raise HTTPException(422, "Le ministère est requis")
    already_active = db.scalar(
        select(MemberMinistryAffiliation).where(
            MemberMinistryAffiliation.member_id == member.id,
            MemberMinistryAffiliation.ministry == ministry,
            MemberMinistryAffiliation.left_at.is_(None),
        )
    )
    if already_active:
        raise HTTPException(409, "Vous êtes déjà affilié(e) à ce ministère")
    affiliation = MemberMinistryAffiliation(
        member_id=member.id, ministry=ministry, joined_at=_today()
    )
    db.add(affiliation)
    db.commit()
    db.refresh(affiliation)
    return affiliation


@router.delete("/members/me/ministries/{affiliation_id}", response_model=MinistryAffiliationRead)
def leave_ministry(
    affiliation_id: int,
    member: Annotated[Member, Depends(get_current_member)],
    db: Annotated[Session, Depends(get_db)],
):
    """Quitte un ministère (renseigne left_at) — la ligne n'est jamais
    supprimée, afin de conserver l'historique."""
    affiliation = db.get(MemberMinistryAffiliation, affiliation_id)
    if not affiliation or affiliation.member_id != member.id:
        raise HTTPException(404, "Affiliation introuvable")
    if affiliation.left_at is None:
        affiliation.left_at = _today()
        db.commit()
        db.refresh(affiliation)
    return affiliation


@router.get("/members/me/ministries", response_model=list[MinistryAffiliationRead])
def my_ministries(
    member: Annotated[Member, Depends(get_current_member)],
    db: Annotated[Session, Depends(get_db)],
):
    return db.scalars(
        select(MemberMinistryAffiliation)
        .where(MemberMinistryAffiliation.member_id == member.id)
        .order_by(MemberMinistryAffiliation.joined_at.desc())
    ).all()


# ── Administration (gestion en masse, centrée sur le ministère) ──────────────


@router.get("/ministries/{ministry}/members", response_model=list[MinistryMemberRead])
def list_ministry_members(
    ministry: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
):
    """Membres actuellement affiliés à un ministère donné, dans le périmètre
    de l'utilisateur, avec recherche facultative par nom/courriel."""
    scope = current_user.accessible_church_ids("member:read")
    if scope is not None and not scope:
        raise HTTPException(403, "Aucun périmètre accessible")
    query = (
        select(Member, MemberMinistryAffiliation)
        .join(MemberMinistryAffiliation, MemberMinistryAffiliation.member_id == Member.id)
        .where(
            MemberMinistryAffiliation.ministry == ministry,
            MemberMinistryAffiliation.left_at.is_(None),
        )
    )
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
    rows = db.execute(query.order_by(Member.last_name, Member.first_name)).all()
    return [
        MinistryMemberRead(
            id=member.id,
            first_name=member.first_name,
            last_name=member.last_name,
            email=member.email,
            affiliation_id=affiliation.id,
            joined_at=affiliation.joined_at,
        )
        for member, affiliation in rows
    ]


@router.post("/ministries/{ministry}/members", response_model=MinistryBulkAddResult)
def bulk_add_ministry_members(
    ministry: str,
    data: MinistryBulkAddRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Affilie plusieurs membres d'un coup à un ministère. Un membre hors du
    périmètre de l'utilisateur ou déjà affilié est ignoré (reporté dans
    `skipped`), sans faire échouer le reste du lot."""
    scope = current_user.accessible_church_ids("member:update")
    if scope is not None and not scope:
        raise HTTPException(403, "Aucun périmètre accessible")

    added: list[int] = []
    skipped: list[int] = []
    today = _today()
    for member_id in data.member_ids:
        member = db.get(Member, member_id)
        if not member or (scope is not None and member.church_id not in scope):
            skipped.append(member_id)
            continue
        already_active = db.scalar(
            select(MemberMinistryAffiliation).where(
                MemberMinistryAffiliation.member_id == member.id,
                MemberMinistryAffiliation.ministry == ministry,
                MemberMinistryAffiliation.left_at.is_(None),
            )
        )
        if already_active:
            skipped.append(member_id)
            continue
        db.add(
            MemberMinistryAffiliation(member_id=member.id, ministry=ministry, joined_at=today)
        )
        added.append(member_id)

    if added:
        db.commit()
    return MinistryBulkAddResult(added=added, skipped=skipped)


@router.delete(
    "/members/{member_id}/ministries/{affiliation_id}",
    response_model=MinistryAffiliationRead,
)
def remove_ministry_affiliation(
    member_id: int,
    affiliation_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retrait par l'admin (renseigne left_at) — ne supprime jamais la ligne,
    afin de conserver l'historique."""
    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(404, "Membre introuvable")
    if not current_user.has_permission("member:update", member.church_id):
        raise HTTPException(403, "Permission insuffisante sur cette église")
    affiliation = db.get(MemberMinistryAffiliation, affiliation_id)
    if not affiliation or affiliation.member_id != member.id:
        raise HTTPException(404, "Affiliation introuvable")
    if affiliation.left_at is None:
        affiliation.left_at = _today()
        db.commit()
        db.refresh(affiliation)
    return affiliation
