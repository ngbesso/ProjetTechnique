from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.donation import Donation, _receipt_number
from app.models.donor import Donor
from app.models.member import Member
from app.schemas.donation import DonationCreate, DonationManualCreate


def create_donation(
    db: Session,
    payload: DonationCreate,
    *,
    member_id: int,
    donor_name: str,
    donor_email: str | None = None,
    payment_reference: str | None = None,
    payment_status: str = "manual",
) -> Donation:
    donation = Donation(
        receipt_number=_receipt_number(),
        amount=payload.amount,
        currency=payload.currency,
        category=payload.category,
        contribution_type=payload.contribution_type,
        church_id=payload.church_id,
        member_id=member_id,
        donor_name=donor_name,
        donor_email=donor_email,
        created_at=datetime.now(timezone.utc),
        payment_reference=payment_reference,
        payment_status=payment_status,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)
    return donation


def create_manual_donation(
    db: Session,
    payload: DonationManualCreate,
    *,
    member: Member | None = None,
    donor: Donor | None = None,
) -> Donation:
    """Saisie manuelle d'un revenu (don/dîme/offrande) par un administrateur,
    hors formulaire membre — église facultative, donateur soit un membre
    existant, soit un donateur enregistré, soit du texte libre (repli)."""
    received_at = (
        datetime.combine(payload.received_on, datetime.min.time(), tzinfo=timezone.utc)
        if payload.received_on
        else datetime.now(timezone.utc)
    )
    member_id: int | None = None
    donor_id: int | None = None
    donor_name = payload.donor_name
    donor_email = payload.donor_email
    if member is not None:
        member_id = member.id
        donor_name = member.full_name
        donor_email = member.email
    elif donor is not None:
        donor_id = donor.id
        donor_name = donor.name
        donor_email = donor.email

    donation = Donation(
        receipt_number=_receipt_number(),
        amount=payload.amount,
        currency=payload.currency,
        category=payload.category,
        contribution_type=payload.contribution_type,
        church_id=payload.church_id,
        member_id=member_id,
        donor_id=donor_id,
        donor_name=donor_name,
        donor_email=donor_email,
        created_at=received_at,
        payment_status="manual",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)
    return donation


def create_from_zeffy(
    db: Session,
    *,
    amount: float,
    currency: str,
    payment_reference: str,
    donor_name: str | None = None,
    donor_email: str | None = None,
) -> Donation:
    """Enregistre un don reçu via le webhook Zeffy.

    Église et catégorie sont inconnues (le formulaire Zeffy générique ne les
    demande pas) : elles restent nulles, à compléter manuellement si besoin.
    """
    donation = Donation(
        receipt_number=_receipt_number(),
        amount=amount,
        currency=currency,
        category=None,
        church_id=None,
        member_id=None,
        donor_name=donor_name,
        donor_email=donor_email,
        created_at=datetime.now(timezone.utc),
        payment_reference=payment_reference,
        payment_status="succeeded",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)
    return donation


def get_by_payment_reference(db: Session, payment_reference: str) -> Donation | None:
    return (
        db.query(Donation)
        .filter(Donation.payment_reference == payment_reference)
        .first()
    )


def get_donation(db: Session, donation_id: int) -> Donation | None:
    return db.get(Donation, donation_id)


def list_all(db: Session, skip: int = 0, limit: int = 100) -> list[Donation]:
    return (
        db.query(Donation)
        .order_by(Donation.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def list_by_member(db: Session, member_id: int) -> list[Donation]:
    return (
        db.query(Donation)
        .filter(Donation.member_id == member_id)
        .order_by(Donation.created_at.desc())
        .all()
    )
