from typing import TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

ModelT = TypeVar("ModelT")


def paginate(
    db: Session, query: Select[tuple[ModelT]], limit: int, offset: int
) -> tuple[list[ModelT], int]:
    """Exécute une requête filtrée (order_by éventuel compris) en appliquant
    limit/offset, et retourne les lignes correspondantes ainsi que le total
    (sans limit/offset). `order_by(None)` retire le tri pour le comptage,
    qui ne dépend pas de l'ordre des lignes."""
    total = db.scalar(select(func.count()).select_from(query.order_by(None).subquery())) or 0
    items = list(db.scalars(query.limit(limit).offset(offset)).all())
    return items, total
