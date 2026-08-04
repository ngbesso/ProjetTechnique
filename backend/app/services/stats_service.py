"""Comptages partagés.

Ne subsiste ici que le comptage d'églises actives, consommé par les
statistiques d'administration. Les comptages d'églises affiliées et de membres
actifs alimentaient la bande de statistiques de l'accueil, retirée depuis, et
ont été supprimés avec elle.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.church import Church


def count_active_churches(db: Session) -> int:
    """Églises marquées actives, église mère comprise."""
    return (
        db.scalar(
            select(func.count()).select_from(Church).where(Church.is_active.is_(True))
        )
        or 0
    )
