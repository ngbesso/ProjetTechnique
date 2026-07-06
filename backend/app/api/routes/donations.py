from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_member, get_current_member_optional
from app.db.session import get_db
from app.models.church import Church
from app.schemas.donation import (
    DonationConfirm,
    DonationCreate,
    DonationRead,
    PaymentIntentRequest,
    PaymentIntentResponse,
    ReceiptRead,
)
from app.schemas.donation import DonationCurrency
from app.services import donation_service, stripe_service

router = APIRouter(prefix="/api/donations", tags=["donations"])


def _get_church_or_404(db: Session, church_id: int) -> Church:
    church = db.get(Church, church_id)
    if church is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Église introuvable")
    return church


@router.post("/payment-intent", response_model=PaymentIntentResponse)
def create_payment_intent(
    payload: PaymentIntentRequest,
    db: Session = Depends(get_db),
    current_member=Depends(get_current_member_optional),
):
    """Crée un Stripe PaymentIntent. Ouvert à tous (membre ou anonyme)."""
    _get_church_or_404(db, payload.church_id)
    amount_cents = int(round(payload.amount * 100))
    pi = stripe_service.create_payment_intent(
        amount_cents=amount_cents,
        currency=payload.currency.value.lower(),
        metadata={
            "member_id": str(current_member.id) if current_member else "",
            "church_id": str(payload.church_id),
            "category": payload.category.value,
            "donor_name": payload.donor_name,
            "donor_email": payload.donor_email or "",
        },
    )
    return PaymentIntentResponse(client_secret=pi.client_secret, payment_intent_id=pi.id)


@router.post("/confirm", response_model=DonationRead, status_code=status.HTTP_201_CREATED)
def confirm_donation(
    payload: DonationConfirm,
    db: Session = Depends(get_db),
    current_member=Depends(get_current_member_optional),
):
    """Vérifie que le paiement Stripe a réussi et crée le don en base."""
    pi = stripe_service.retrieve_payment_intent(payload.payment_intent_id)
    if pi.status != "succeeded":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Paiement non confirmé par Stripe",
        )

    existing = donation_service.get_by_payment_intent(db, payload.payment_intent_id)
    if existing:
        return existing

    _get_church_or_404(db, payload.church_id)

    donation_payload = DonationCreate(
        amount=round(pi.amount / 100, 2),
        currency=DonationCurrency(pi.currency.upper()),
        category=payload.category,
        church_id=payload.church_id,
    )
    return donation_service.create_donation(
        db,
        donation_payload,
        member_id=current_member.id if current_member else None,
        donor_name=payload.donor_name,
        donor_email=payload.donor_email,
        payment_intent_id=payload.payment_intent_id,
        payment_status="succeeded",
    )


@router.post("/", response_model=DonationRead, status_code=status.HTTP_201_CREATED)
def create_donation(
    payload: DonationCreate,
    db: Session = Depends(get_db),
    current_member=Depends(get_current_member),
):
    """Crée un don direct (sans Stripe). Nécessite d'être membre."""
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Don introuvable")

    if donation.member_id != current_member.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit")

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Don introuvable")

    if donation.member_id != current_member.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit")

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
