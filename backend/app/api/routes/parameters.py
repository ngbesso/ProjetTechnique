from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.parameter import ParameterValue
from app.models.user import User
from app.schemas.parameter import (
    VALID_CATEGORIES,
    ParameterValueCreate,
    ParameterValueRead,
    ParameterValueUpdate,
)

router = APIRouter(prefix="/parameters", tags=["paramètres"])


def _check_category(category: str) -> None:
    if category not in VALID_CATEGORIES:
        raise HTTPException(
            400,
            f"Catégorie inconnue. Valeurs acceptées : {', '.join(sorted(VALID_CATEGORIES))}",
        )


def _require_admin(user: User) -> None:
    if not user.has_global_permission("*"):
        raise HTTPException(403, "Réservé aux administrateurs globaux")


@router.get("/{category}", response_model=list[ParameterValueRead])
def list_values(category: str, db: Annotated[Session, Depends(get_db)]):
    _check_category(category)
    return db.scalars(
        select(ParameterValue)
        .where(ParameterValue.category == category)
        .order_by(ParameterValue.position, ParameterValue.label)
    ).all()


@router.post("/{category}", response_model=ParameterValueRead, status_code=201)
def create_value(
    category: str,
    data: ParameterValueCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _check_category(category)
    _require_admin(current_user)
    label = data.label.strip()
    if not label:
        raise HTTPException(422, "Le libellé ne peut pas être vide")
    existing = db.scalar(
        select(ParameterValue).where(
            ParameterValue.category == category,
            ParameterValue.label == label,
        )
    )
    if existing:
        raise HTTPException(409, "Cette valeur existe déjà")
    pv = ParameterValue(category=category, label=label, position=data.position)
    db.add(pv)
    db.commit()
    db.refresh(pv)
    return pv


@router.patch("/{id}", response_model=ParameterValueRead)
def update_value(
    id: int,
    data: ParameterValueUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_admin(current_user)
    pv = db.get(ParameterValue, id)
    if not pv:
        raise HTTPException(404, "Valeur introuvable")
    if data.label is not None:
        label = data.label.strip()
        if not label:
            raise HTTPException(422, "Le libellé ne peut pas être vide")
        pv.label = label
    if data.position is not None:
        pv.position = data.position
    db.commit()
    db.refresh(pv)
    return pv


@router.delete("/{id}", status_code=204)
def delete_value(
    id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_admin(current_user)
    pv = db.get(ParameterValue, id)
    if not pv:
        raise HTTPException(404, "Valeur introuvable")
    db.delete(pv)
    db.commit()
