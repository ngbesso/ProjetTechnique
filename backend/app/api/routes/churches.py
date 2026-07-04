from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.models.church import Church
from app.models.member import Member
from app.schemas.church import ChurchCreate, ChurchRead, ChurchUpdate

router = APIRouter(prefix="/churches", tags=["églises"])
can_manage = Depends(require_global_permission("church:manage"))


def get_mother(db: Session) -> Church:
    mother = db.scalar(select(Church).where(Church.parent_id.is_(None)))
    if mother is None:
        raise HTTPException(500, "Église mère introuvable (seed manquant)")
    return mother


@router.get("", response_model=list[ChurchRead])
def list_churches(db: Annotated[Session, Depends(get_db)], district: str | None = None):
    query = select(Church)
    if district:
        query = query.where(Church.district == district)
    return db.scalars(query.order_by(Church.name)).all()


@router.get("/{church_id}", response_model=ChurchRead)
def get_church(church_id: int, db: Annotated[Session, Depends(get_db)]):
    church = db.get(Church, church_id)
    if not church:
        raise HTTPException(404, "Église introuvable")
    return church


@router.post("", response_model=ChurchRead, status_code=201, dependencies=[can_manage])
def create_church(data: ChurchCreate, db: Annotated[Session, Depends(get_db)]):
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
    for k, v in data.model_dump(exclude_unset=True).items():
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
