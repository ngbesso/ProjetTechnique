import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import DateTime, Enum, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class DonationCategory(str, PyEnum):
    SOUTIEN_SPIRITUEL = "soutien_spirituel"
    ACTION_COMMUNAUTAIRE = "action_communautaire"
    DEVELOPPEMENT = "developpement"

class DonationCurrency(str, PyEnum):
    CAD = "CAD"
    USD = "USD"

def _receipt_number() -> str:
    return f"REC-{uuid.uuid4().hex[:8].upper()}"

class Donation(Base):
    __tablename__ = "donations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    receipt_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, default=_receipt_number)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(Enum(DonationCurrency, name="donationcurrency"), nullable=False, default=DonationCurrency.CAD)
    category: Mapped[str] = mapped_column(Enum(DonationCategory, name="donationcategory"), nullable=False)
    member_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    donor_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    donor_email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
