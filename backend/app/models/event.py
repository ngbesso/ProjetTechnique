import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RegistrationStatus(str, enum.Enum):
    confirmed = "confirmed"
    cancelled = "cancelled"


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    date_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    date_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    location: Mapped[str | None] = mapped_column(String(255), default=None)
    # Église organisatrice (facultative : un événement peut concerner toute la mission)
    church_id: Mapped[int | None] = mapped_column(
        ForeignKey("churches.id", ondelete="SET NULL"), default=None, index=True
    )
    district: Mapped[str | None] = mapped_column(String(50), default=None)
    max_participants: Mapped[int | None] = mapped_column(Integer, default=None)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    church = relationship("Church", lazy="select")
    registrations = relationship(
        "EventRegistration",
        back_populates="event",
        cascade="all, delete-orphan",
        lazy="select",
    )


class EventRegistration(Base):
    __tablename__ = "event_registrations"
    __table_args__ = (
        UniqueConstraint("event_id", "member_id", name="uq_event_registrations_event_member"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), index=True
    )
    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), index=True
    )
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    status: Mapped[RegistrationStatus] = mapped_column(
        Enum(RegistrationStatus, native_enum=False, length=20),
        default=RegistrationStatus.confirmed,
    )

    event = relationship("Event", back_populates="registrations", lazy="select")
    member = relationship("Member", lazy="select")
