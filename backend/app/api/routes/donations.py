from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_member
from app.db.session import get_db
from app.models.church import Church
from app.schemas.donation import DonationCreate, DonationRead, ReceiptRead
from app.services import donation_service

router = APIRouter(prefix="/api/donations", tags=["donations"])


def _get_church_or_404(db: Session, church_id: int) -> Church:
    church = db.get(Church, church_id)
    if church is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Église introuvable"
        )
    return church


@router.post("/", response_model=DonationRead, status_code=status.HTTP_201_CREATED)
def create_donation(
    payload: DonationCreate,
    db: Session = Depends(get_db),
    current_member=Depends(get_current_member),
):
    """Crée un don. Le membre authentifié choisit l'église destinataire."""
    _get_church_or_404(db, payload.church_id)

    return donation_service.create_donation(
        db,
        payload,
        member_id=current_member.id,
        donor_name=current_member.full_name,
        donor_email=current_member.email,
    )


@router.get("/", response_model=list[DonationRead])
def list_donations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Liste tous les dons — réservé aux administrateurs."""
    return donation_service.list_all(db, skip=skip, limit=limit)


@router.get("/me", response_model=list[DonationRead])
def list_my_donations(
    db: Session = Depends(get_db),
    current_member=Depends(get_current_member),
):
    """Liste les dons du membre connecté."""
    return donation_service.list_by_member(db, current_member.id)


@router.get("/{donation_id}", response_model=DonationRead)
def get_donation(
    donation_id: int,
    db: Session = Depends(get_db),
    current_member=Depends(get_current_member),
):
    """Retourne un don. Le membre ne peut accéder qu'à ses propres dons."""
    donation = donation_service.get_donation(db, donation_id)
    if donation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Don introuvable"
        )

    if donation.member_id != current_member.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit"
        )

    return donation


@router.get("/{donation_id}/recu", response_model=ReceiptRead)
def get_receipt(
    donation_id: int,
    db: Session = Depends(get_db),
    current_member=Depends(get_current_member),
):
    """Retourne le reçu fiscal d'un don."""
    donation = donation_service.get_donation(db, donation_id)
    if donation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Don introuvable"
        )

    if donation.member_id != current_member.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit"
        )

    return ReceiptRead(
        receipt_number=donation.receipt_number,
        amount=float(donation.amount),
        currency=donation.currency,
        category=donation.category,
        church_id=donation.church_id,
        donor_name=donation.donor_name or current_member.full_name,
        donor_email=donation.donor_email,
        created_at=donation.created_at,
    )
