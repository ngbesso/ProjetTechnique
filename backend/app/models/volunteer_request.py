import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class VolunteerRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class VolunteerRequest(Base):
    __tablename__ = "volunteer_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), index=True
    )
    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), index=True
    )
    message: Mapped[str | None] = mapped_column(Text, default=None)
    status: Mapped[VolunteerRequestStatus] = mapped_column(
        Enum(VolunteerRequestStatus, native_enum=False, length=20),
        default=VolunteerRequestStatus.pending,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    member = relationship("Member", lazy="select")
    event = relationship("Event", lazy="select")
