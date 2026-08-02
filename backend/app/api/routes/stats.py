from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.stats import PublicStats
from app.services import stats_service

router = APIRouter(prefix="/stats", tags=["statistiques publiques"])


@router.get("/public", response_model=PublicStats)
def get_public_stats(db: Annotated[Session, Depends(get_db)]) -> PublicStats:
    """Comptages affichés sur la page d'accueil. Volontairement sans
    authentification : ce sont des agrégats sans donnée nominative."""
    return PublicStats(
        active_churches=stats_service.count_active_churches(db),
        affiliated_churches=stats_service.count_affiliated_churches(db),
        active_members=stats_service.count_active_members(db),
    )
