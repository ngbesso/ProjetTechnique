from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardStats
from app.services import dashboard_service

router = APIRouter(prefix="/admin", tags=["dashboard"])

# Volontairement gardé sous get_current_admin (permission globale « * ») plutôt
# que sous une permission dédiée : le tableau de bord agrège les données de tous
# les modules (membres, dons, sermons, articles, prières, bénévolat). Une
# permission propre du type « dashboard:read » permettrait à son détenteur de
# lire indirectement des données qu'il n'a pas le droit de consulter module par
# module. Même raisonnement dans reports.py.


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(
    _admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> DashboardStats:
    return dashboard_service.get_dashboard_stats(db)
