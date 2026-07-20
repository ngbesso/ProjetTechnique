import enum
from datetime import datetime

from sqlalchemy import (
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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RegistrationStatus(str, enum.Enum):
    confirmed = "confirmed"
    cancelled = "cancelled"


class EventStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    cancelled = "cancelled"
    completed = "completed"


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    category: Mapped[str] = mapped_column(String(50), default="Conférence")
    date_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    date_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    location: Mapped[str | None] = mapped_column(String(255), default=None)
    instructor: Mapped[str | None] = mapped_column(String(150), default=None)
    price: Mapped[float | None] = mapped_column(Numeric(10, 2), default=0)
    # Église organisatrice (facultative : un événement peut concerner toute la mission)
    church_id: Mapped[int | None] = mapped_column(
        ForeignKey("churches.id", ondelete="SET NULL"), default=None, index=True
    )
    district: Mapped[str | None] = mapped_column(String(50), default=None)
    capacity: Mapped[int | None] = mapped_column(Integer, default=None)
    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, native_enum=False, length=20), default=EventStatus.draft
    )
    image_key: Mapped[str | None] = mapped_column(String(500), default=None)
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
        UniqueConstraint("event_id", "email", name="uq_event_registrations_event_email"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), index=True
    )
    member_id: Mapped[int | None] = mapped_column(
        ForeignKey("members.id", ondelete="SET NULL"), default=None, index=True
    )
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255))
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    status: Mapped[RegistrationStatus] = mapped_column(
        Enum(RegistrationStatus, native_enum=False, length=20),
        default=RegistrationStatus.confirmed,
    )

    event = relationship("Event", back_populates="registrations", lazy="select")
    member = relationship("Member", lazy="select")
