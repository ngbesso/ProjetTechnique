from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.models.church import Church
from app.models.member import Member
from app.schemas.church import (
    ChurchAdminStats,
    ChurchCreate,
    ChurchRead,
    ChurchUpdate,
    DistrictCount,
)


def _check_email_unique(
    db: Session, email: str | None, exclude_id: int | None = None
) -> None:
    """Lève HTTP 409 si l'email est déjà utilisé par une autre église."""
    if not email:
        return
    query = select(Church).where(Church.email == email)
    if exclude_id is not None:
        query = query.where(Church.id != exclude_id)
    if db.scalar(query):
        raise HTTPException(
            409,
            f"L'adresse courriel « {email} » est déjà utilisée par une autre église.",
        )


router = APIRouter(prefix="/churches", tags=["églises"])
can_manage = Depends(require_global_permission("church:manage"))


def get_mother(db: Session) -> Church:
    mother = db.scalar(select(Church).where(Church.parent_id.is_(None)))
    if mother is None:
        raise HTTPException(500, "Église mère introuvable (seed manquant)")
    return mother


@router.get("", response_model=list[ChurchRead])
def list_churches(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    district: str | None = None,
    active: bool | None = None,
):
    query = select(Church)
    if q:
        term = f"%{q}%"
        query = query.where(Church.name.ilike(term) | Church.pastor_name.ilike(term))
    if district:
        query = query.where(Church.district == district)
    if active is not None:
        query = query.where(Church.is_active == active)
    return db.scalars(query.order_by(Church.name)).all()


@router.get("/{church_id}", response_model=ChurchRead)
def get_church(church_id: int, db: Annotated[Session, Depends(get_db)]):
    church = db.get(Church, church_id)
    if not church:
        raise HTTPException(404, "Église introuvable")
    return church


@router.get("/admin/stats", response_model=ChurchAdminStats, dependencies=[can_manage])
def get_churches_stats(db: Annotated[Session, Depends(get_db)]):
    """Nombre total d'Églises, actives/inactives et répartition par district."""
    total = db.scalar(select(func.count()).select_from(Church)) or 0
    active = (
        db.scalar(
            select(func.count()).select_from(Church).where(Church.is_active.is_(True))
        )
        or 0
    )
    rows = db.execute(
        select(Church.district, func.count(Church.id))
        .where(Church.district.isnot(None))
        .group_by(Church.district)
    ).all()
    return ChurchAdminStats(
        total=total,
        active=active,
        inactive=total - active,
        by_district=[DistrictCount(district=d, count=c) for d, c in rows],
    )


@router.post("", response_model=ChurchRead, status_code=201, dependencies=[can_manage])
def create_church(data: ChurchCreate, db: Annotated[Session, Depends(get_db)]):
    _check_email_unique(db, data.email)
    mother = get_mother(db)
    church = Church(**data.model_dump(), parent_id=mother.id)
    db.add(church)
    db.commit()
    db.refresh(church)
    return church


@router.patch("/{church_id}", response_model=ChurchRead, dependencies=[can_manage])
def update_church(
    church_id: int, data: ChurchUpdate, db: Annotated[Session, Depends(get_db)]
):
    church = db.get(Church, church_id)
    if not church:
        raise HTTPException(404, "Église introuvable")
    dump = data.model_dump(exclude_unset=True)
    if not church.is_active and dump.get("is_active") is not True:
        raise HTTPException(
            409, "Église désactivée : réactivez-la avant de la modifier"
        )
    if "email" in dump:
        _check_email_unique(db, dump["email"], exclude_id=church_id)
    if dump.get("is_active") is False and church.parent_id is None:
        raise HTTPException(409, "L'église mère ne peut pas être désactivée")
    for k, v in dump.items():
        setattr(church, k, v)
    db.commit()
    db.refresh(church)
    return church


@router.delete("/{church_id}", status_code=204, dependencies=[can_manage])
def delete_church(church_id: int, db: Annotated[Session, Depends(get_db)]):
    church = db.get(Church, church_id)
    if not church:
        raise HTTPException(404, "Église introuvable")
    if church.parent_id is None:
        raise HTTPException(409, "L'église mère ne peut pas être supprimée")
    if db.scalar(
        select(func.count()).select_from(Member).where(Member.church_id == church_id)
    ):
        raise HTTPException(
            409, "Cette église a des membres et ne peut pas être supprimée"
        )
    db.delete(church)
    db.commit()
