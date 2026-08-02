from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.models.parameter import ParameterValue
from app.schemas.parameter import (
    VALID_CATEGORIES,
    ParameterValueCreate,
    ParameterValueRead,
    ParameterValueUpdate,
)
from app.services import parameter_service

router = APIRouter(prefix="/parameters", tags=["paramètres"])
# Les listes de valeurs (sexes, districts, catégories…) alimentent tous les
# modules : leur édition relève d'une permission d'organisation dédiée, la
# lecture restant publique puisque les formulaires du site s'en servent.
can_manage = Depends(require_global_permission("parameter:manage"))


def _load(db: Session, value_id: int) -> ParameterValue:
    value = parameter_service.get_value(db, value_id)
    if not value:
        raise HTTPException(404, "Valeur introuvable")
    return value


def _check_category(category: str) -> None:
    if category not in VALID_CATEGORIES:
        raise HTTPException(
            400,
            f"Catégorie inconnue. Valeurs acceptées : {', '.join(sorted(VALID_CATEGORIES))}",
        )


def _check_restricted_to_sexe(category: str, restricted_to_sexe: str | None) -> None:
    if restricted_to_sexe is not None and category != "ministry":
        raise HTTPException(
            422, "restricted_to_sexe n'est configurable que pour la catégorie ministry"
        )


@router.get("/{category}", response_model=list[ParameterValueRead])
def list_values(category: str, db: Annotated[Session, Depends(get_db)]):
    _check_category(category)
    return parameter_service.list_values(db, category)


@router.post(
    "/{category}",
    response_model=ParameterValueRead,
    status_code=201,
    dependencies=[can_manage],
)
def create_value(
    category: str,
    data: ParameterValueCreate,
    db: Annotated[Session, Depends(get_db)],
):
    _check_category(category)
    label = data.label.strip()
    if not label:
        raise HTTPException(422, "Le libellé ne peut pas être vide")
    _check_restricted_to_sexe(category, data.restricted_to_sexe)
    if parameter_service.find_by_label(db, category, label):
        raise HTTPException(409, "Cette valeur existe déjà")
    return parameter_service.create_value(
        db,
        category=category,
        label=label,
        position=data.position,
        restricted_to_sexe=data.restricted_to_sexe,
    )


@router.patch("/{id}", response_model=ParameterValueRead, dependencies=[can_manage])
def update_value(
    id: int,
    data: ParameterValueUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    value = _load(db, id)
    label: str | None = None
    if data.label is not None:
        label = data.label.strip()
        if not label:
            raise HTTPException(422, "Le libellé ne peut pas être vide")
    set_restriction = "restricted_to_sexe" in data.model_fields_set
    if set_restriction:
        _check_restricted_to_sexe(value.category, data.restricted_to_sexe)
    return parameter_service.update_value(
        db,
        value,
        label=label,
        position=data.position,
        restricted_to_sexe=data.restricted_to_sexe,
        set_restriction=set_restriction,
    )


@router.delete("/{id}", status_code=204, dependencies=[can_manage])
def delete_value(
    id: int,
    db: Annotated[Session, Depends(get_db)],
):
    value = _load(db, id)
    usage = parameter_service.usage_count(db, value)
    if usage:
        detail = " et ".join(f"{count} {noun}(s)" for noun, count in usage)
        raise HTTPException(
            409, f"Impossible de supprimer « {value.label} » : utilisé par {detail}."
        )
    parameter_service.delete_value(db, value)
