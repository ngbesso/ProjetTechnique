"""CRUD des listes de valeurs paramétrables.

Service volontairement mince : ce module n'a pas de logique métier propre
au-delà du comptage d'usage, qui empêche de supprimer une valeur encore
référencée. Le reste n'est que l'accès à la session, factorisé ici pour que
les routes n'aient plus à la manipuler.
"""

from sqlalchemy import String, cast, func, select
from sqlalchemy.orm import Session

from app.models.church import Church
from app.models.donation import Donation
from app.models.event import Event
from app.models.expense import Expense
from app.models.leader import Leader
from app.models.member import Member
from app.models.ministry_affiliation import MemberMinistryAffiliation
from app.models.parameter import ParameterValue

# Catégorie -> tables/colonnes dont les enregistrements référencent une valeur
# (modèle, nom de colonne, nom singulier pour le message d'erreur). Ajouter une
# entrée ici suffit pour protéger une future catégorie contre la suppression
# de valeurs encore utilisées — aucune autre logique à dupliquer.
_USAGE_MAP: dict[str, list[tuple[type, str, str]]] = {
    "sexe": [(Member, "sexe", "membre")],
    "family_status": [(Member, "family_status", "membre")],
    "district": [(Church, "district", "église"), (Event, "district", "événement")],
    "donation_category": [(Donation, "category", "don")],
    "event_category": [(Event, "category", "événement")],
    "intervenant_category": [(Event, "intervenant_category", "événement")],
    "ministry": [(MemberMinistryAffiliation, "ministry", "affiliation de membre")],
    "expense_category": [(Expense, "category", "dépense")],
    "leader_role": [(Leader, "role", "membre du leadership")],
}


def get_value(db: Session, value_id: int) -> ParameterValue | None:
    return db.get(ParameterValue, value_id)


def list_values(db: Session, category: str) -> list[ParameterValue]:
    return list(
        db.scalars(
            select(ParameterValue)
            .where(ParameterValue.category == category)
            .order_by(ParameterValue.position, ParameterValue.label)
        ).all()
    )


def find_by_label(db: Session, category: str, label: str) -> ParameterValue | None:
    return db.scalar(
        select(ParameterValue).where(
            ParameterValue.category == category,
            ParameterValue.label == label,
        )
    )


def create_value(
    db: Session,
    *,
    category: str,
    label: str,
    position: int,
    restricted_to_sexe: str | None,
) -> ParameterValue:
    value = ParameterValue(
        category=category,
        label=label,
        position=position,
        restricted_to_sexe=restricted_to_sexe,
    )
    db.add(value)
    db.commit()
    db.refresh(value)
    return value


def update_value(
    db: Session,
    value: ParameterValue,
    *,
    label: str | None = None,
    position: int | None = None,
    restricted_to_sexe: str | None = None,
    set_restriction: bool = False,
) -> ParameterValue:
    """`set_restriction` distingue « champ non fourni » de « champ mis à None » :
    seul le premier cas laisse la restriction inchangée."""
    if label is not None:
        value.label = label
    if position is not None:
        value.position = position
    if set_restriction:
        value.restricted_to_sexe = restricted_to_sexe
    db.commit()
    db.refresh(value)
    return value


def delete_value(db: Session, value: ParameterValue) -> None:
    db.delete(value)
    db.commit()


def usage_count(db: Session, value: ParameterValue) -> list[tuple[str, int]]:
    """Compte, pour chaque table associée à la catégorie de `value`, le nombre
    d'enregistrements dont la colonne vaut son libellé."""
    usage: list[tuple[str, int]] = []
    for model, column_name, noun in _USAGE_MAP.get(value.category, []):
        column = getattr(model, column_name)
        count = (
            db.scalar(
                select(func.count())
                .select_from(model)
                .where(cast(column, String) == value.label)
            )
            or 0
        )
        if count:
            usage.append((noun, count))
    return usage
