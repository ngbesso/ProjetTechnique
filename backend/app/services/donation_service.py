from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.donation import Donation, _receipt_number
from app.schemas.donation import DonationCreate


def create_donation(
    db: Session,
    payload: DonationCreate,
    *,
    member_id: int,
    donor_name: str,
    donor_email: str | None = None,
    payment_intent_id: str | None = None,
    payment_status: str = "manual",
) -> Donation:
    donation = Donation(
        receipt_number=_receipt_number(),
        amount=payload.amount,
        currency=payload.currency,
        category=payload.category,
        church_id=payload.church_id,
        member_id=member_id,
        donor_name=donor_name,
        donor_email=donor_email,
        created_at=datetime.now(timezone.utc),
        payment_intent_id=payment_intent_id,
        payment_status=payment_status,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)
    return donation


def get_by_payment_intent(db: Session, payment_intent_id: str) -> Donation | None:
    return db.query(Donation).filter(Donation.payment_intent_id == payment_intent_id).first()


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
