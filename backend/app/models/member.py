import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MemberStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    inactive = "inactive"
    rejected = "rejected"


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(primary_key=True)
    church_id: Mapped[int] = mapped_column(
        ForeignKey("churches.id", ondelete="RESTRICT"), index=True
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), unique=True, default=None
    )
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    address: Mapped[str | None] = mapped_column(String(255), default=None)
    birth_date: Mapped[date | None] = mapped_column(Date, default=None)
    sexe: Mapped[str | None] = mapped_column(String(20), default=None)
    telephone: Mapped[str | None] = mapped_column(String(30), default=None)
    family_status: Mapped[str | None] = mapped_column(String(50), default=None)
    conversion_date: Mapped[date | None] = mapped_column(Date, default=None)
    is_baptized: Mapped[bool] = mapped_column(Boolean, default=False)
    member_code: Mapped[str | None] = mapped_column(
        String(30), unique=True, default=None
    )
    status: Mapped[MemberStatus] = mapped_column(
        Enum(MemberStatus, native_enum=False, length=20), default=MemberStatus.pending
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    donations = relationship("Donation", back_populates="member", lazy="select")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
