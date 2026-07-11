import enum
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FormationStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class Formation(Base):
    __tablename__ = "formations"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    instructor: Mapped[str] = mapped_column(String(150))
    formation_date: Mapped[date] = mapped_column(Date)
    price: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    capacity: Mapped[int] = mapped_column(Integer)
    status: Mapped[FormationStatus] = mapped_column(
        Enum(FormationStatus, native_enum=False, length=20),
        default=FormationStatus.draft,
    )
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class FormationRegistration(Base):
    __tablename__ = "formation_registrations"
    __table_args__ = (
        UniqueConstraint(
            "formation_id", "email", name="uq_formation_registration_email"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    formation_id: Mapped[int] = mapped_column(
        ForeignKey("formations.id", ondelete="CASCADE"), index=True
    )
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
