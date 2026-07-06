import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

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
    receipt_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, default=_receipt_number
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(
        Enum(DonationCurrency, name="donationcurrency"),
        nullable=False,
        default=DonationCurrency.CAD,
    )
    category: Mapped[str | None] = mapped_column(
        Enum(DonationCategory, name="donationcategory"), nullable=True
    )
    # Église destinataire du don (inconnue pour les dons reçus via le webhook Zeffy)
    church_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("churches.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    # Membre donateur (facultatif : anonyme pour les dons Zeffy)
    member_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("members.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    donor_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    donor_email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    payment_reference: Mapped[str | None] = mapped_column(
        String(100), nullable=True, unique=True, index=True
    )
    payment_status: Mapped[str] = mapped_column(String(50), nullable=False, default="manual")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    church = relationship("Church", lazy="select")
    member = relationship("Member", back_populates="donations", lazy="select")
