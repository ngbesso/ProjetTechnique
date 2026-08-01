from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.schemas.donor import DonorCreate, DonorRead
from app.services import donor_service

router = APIRouter(prefix="/api/donors", tags=["donors"])
can_manage_finance = Depends(require_global_permission("finance:manage"))


@router.get("/", response_model=list[DonorRead], dependencies=[can_manage_finance])
def list_donors(
    q: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Recherche des donateurs déjà enregistrés, pour les réutiliser sans les retaper."""
    return donor_service.search_donors(db, q, limit)


@router.post(
    "/",
    response_model=DonorRead,
    status_code=201,
    dependencies=[can_manage_finance],
)
def create_donor(payload: DonorCreate, db: Session = Depends(get_db)):
    """Crée un donateur, ou réutilise une fiche existante (même courriel/nom)."""
    return donor_service.get_or_create_donor(db, payload.name, payload.email)
