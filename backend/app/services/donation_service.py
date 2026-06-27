from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.donation import Donation, _receipt_number
from app.schemas.donation import DonationCreate


def create_donation(
    db: Session,
    payload: DonationCreate,
    *,
    member_id: int | None = None,
    donor_name: str | None = None,
    donor_email: str | None = None,
) -> Donation:
    donation = Donation(
        receipt_number=_receipt_number(),
        amount=payload.amount,
        currency=payload.currency,
        category=payload.category,
        member_id=member_id,
        donor_name=donor_name or payload.donor_name,
        donor_email=donor_email or payload.donor_email,
        created_at=datetime.now(timezone.utc),
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)
    return donation


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
