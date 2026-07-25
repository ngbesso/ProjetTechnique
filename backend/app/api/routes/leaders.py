from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.church import Church
from app.models.leader import Leader, LeaderRole
from app.schemas.leader import LeaderCreate, LeaderList, LeaderRead, LeaderUpdate
from app.services import leader_service, storage

router = APIRouter(prefix="/api/leaders", tags=["leadership"])
requires_admin = Depends(get_current_admin)


def _load(db: Session, leader_id: int) -> Leader:
    leader = db.get(Leader, leader_id)
    if leader is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Membre du leadership introuvable")
    return leader


def _check_church_exists(db: Session, church_id: int | None) -> None:
    """Évite une IntegrityError brute (FK) si l'église fournie n'existe pas."""
    if church_id is not None and db.get(Church, church_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Église introuvable")


def _load_published(db: Session, leader_id: int) -> Leader:
    """Une fiche non publiée se comporte comme inexistante pour le public."""
    leader = _load(db, leader_id)
    if not leader.is_published:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Membre du leadership introuvable")
    return leader


def _to_read(leader: Leader) -> LeaderRead:
    photo_url = (
        storage.presigned_url(leader.photo_key, expires=3600) if leader.photo_key else None
    )
    return LeaderRead(
        id=leader.id,
        first_name=leader.first_name,
        last_name=leader.last_name,
        title=leader.title,
        role=leader.role,
        district=leader.district,
        church_id=leader.church_id,
        bio=leader.bio,
        email=leader.email,
        phone=leader.phone,
        years_of_service=leader.years_of_service,
        is_published=leader.is_published,
        order_index=leader.order_index,
        created_at=leader.created_at,
        updated_at=leader.updated_at,
        photo_url=photo_url,
    )


@router.get("/", response_model=LeaderList)
def list_leaders(
    db: Annotated[Session, Depends(get_db)],
    role: LeaderRole | None = None,
    district: str | None = None,
    church_id: int | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Liste publique des membres du leadership publiés."""
    leaders = leader_service.list_leaders(
        db,
        published_only=True,
        role=role,
        district=district,
        church_id=church_id,
        skip=offset,
        limit=limit,
    )
    total = leader_service.count_leaders(
        db, published_only=True, role=role, district=district, church_id=church_id
    )
    return LeaderList(
        items=[_to_read(leader) for leader in leaders], total=total, limit=limit, offset=offset
    )


@router.get("/admin", response_model=LeaderList, dependencies=[requires_admin])
def list_leaders_admin(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    role: LeaderRole | None = None,
    district: str | None = None,
    church_id: int | None = None,
    is_published: bool | None = None,
    limit: int = Query(100, ge=1, le=300),
    offset: int = Query(0, ge=0),
):
    """Liste tous les membres du leadership (brouillons compris) — réservé aux administrateurs."""
    leaders = leader_service.list_leaders(
        db,
        published_only=False,
        role=role,
        district=district,
        church_id=church_id,
        q=q,
        is_published=is_published,
        skip=offset,
        limit=limit,
    )
    total = leader_service.count_leaders(
        db,
        published_only=False,
        role=role,
        district=district,
        church_id=church_id,
        q=q,
        is_published=is_published,
    )
    return LeaderList(
        items=[_to_read(leader) for leader in leaders], total=total, limit=limit, offset=offset
    )


@router.get("/{leader_id}", response_model=LeaderRead)
def get_leader(leader_id: int, db: Annotated[Session, Depends(get_db)]):
    """Détail public d'un membre du leadership publié."""
    return _to_read(_load_published(db, leader_id))


@router.post(
    "/", response_model=LeaderRead, status_code=status.HTTP_201_CREATED, dependencies=[requires_admin]
)
def create_leader(payload: LeaderCreate, db: Annotated[Session, Depends(get_db)]):
    """Crée un membre du leadership — réservé aux administrateurs."""
    _check_church_exists(db, payload.church_id)
    leader = leader_service.create_leader(db, payload)
    return _to_read(leader)


@router.put("/{leader_id}", response_model=LeaderRead, dependencies=[requires_admin])
def update_leader(
    leader_id: int, payload: LeaderUpdate, db: Annotated[Session, Depends(get_db)]
):
    """Modifie un membre du leadership — réservé aux administrateurs."""
    if "church_id" in payload.model_fields_set:
        _check_church_exists(db, payload.church_id)
    leader = leader_service.update_leader(db, _load(db, leader_id), payload)
    return _to_read(leader)


@router.delete(
    "/{leader_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[requires_admin]
)
def delete_leader(leader_id: int, db: Annotated[Session, Depends(get_db)]):
    """Supprime un membre du leadership — réservé aux administrateurs."""
    leader_service.delete_leader(db, _load(db, leader_id))


@router.post("/{leader_id}/photo", response_model=LeaderRead, dependencies=[requires_admin])
def upload_leader_photo(
    leader_id: int,
    db: Annotated[Session, Depends(get_db)],
    file: Annotated[UploadFile, File()],
):
    """Téléverse (ou remplace) la photo — réservé aux administrateurs."""
    leader = leader_service.upload_photo(
        db, _load(db, leader_id), file.file, file.content_type, file.filename
    )
    return _to_read(leader)
