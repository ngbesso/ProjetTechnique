"""Comptages publics partagés entre la route publique /stats/public et les
statistiques d'administration, pour qu'une seule définition fasse foi (une
église « affiliée » exclut toujours l'église mère, un membre « actif » est
toujours au statut MemberStatus.active)."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.church import Church
from app.models.member import Member, MemberStatus


def count_active_churches(db: Session) -> int:
    """Églises marquées actives, église mère comprise."""
    return (
        db.scalar(
            select(func.count()).select_from(Church).where(Church.is_active.is_(True))
        )
        or 0
    )


def count_affiliated_churches(db: Session) -> int:
    """Églises affiliées, c'est-à-dire toutes celles rattachées à une église
    parente — l'église mère elle-même est donc exclue."""
    return (
        db.scalar(
            select(func.count()).select_from(Church).where(Church.parent_id.is_not(None))
        )
        or 0
    )


def count_active_members(db: Session) -> int:
    """Membres actifs, toutes églises confondues (pas de périmètre : ce
    comptage alimente la page d'accueil publique)."""
    return (
        db.scalar(
            select(func.count())
            .select_from(Member)
            .where(Member.status == MemberStatus.active)
        )
        or 0
    )
