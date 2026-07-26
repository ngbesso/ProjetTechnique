from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    # Église concernée (facultative : dépense mission-wide si nulle)
    church_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("churches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Responsable de la transaction : renseigné automatiquement depuis l'utilisateur connecté
    responsible_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    # Justification obligatoire de la dépense
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    # Pièce jointe justificative (facultative) : facture, reçu, etc.
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    attachment_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    church = relationship("Church", lazy="select")
    responsible = relationship("User", lazy="select")
