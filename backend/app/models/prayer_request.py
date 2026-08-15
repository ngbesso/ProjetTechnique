import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PrayerRequestStatus(str, enum.Enum):
    new = "new"
    handled = "handled"


class PrayerRequest(Base):
    __tablename__ = "prayer_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), index=True
    )
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[PrayerRequestStatus] = mapped_column(
        Enum(PrayerRequestStatus, native_enum=False, length=20),
        default=PrayerRequestStatus.new,
    )
    # Prise en charge : membre de l'équipe pastorale qui s'est assigné la
    # demande (null = personne). Conservée si le compte est supprimé.
    handled_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None, index=True
    )
    handled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    member = relationship("Member", lazy="select")
    handler = relationship("User", lazy="select")
