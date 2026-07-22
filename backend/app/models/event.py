import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
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


class EventFormat(str, enum.Enum):
    presentiel = "presentiel"
    en_ligne = "en_ligne"
    hybride = "hybride"


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
    # Catégorie de l'intervenant (Pasteur/Conférencier/Diacre…), distincte du
    # nom de la personne (instructor).
    intervenant_category: Mapped[str | None] = mapped_column(String(50), default=None)
    price: Mapped[float | None] = mapped_column(Numeric(10, 2), default=0)
    # Chemin du formulaire Zeffy (même mécanisme que la page Don) pour les
    # événements payants — ex. /fr/donation-form/xxxxxxxx-xxxx-xxxx-xxxx
    zeffy_form_path: Mapped[str | None] = mapped_column(String(500), default=None)
    # Église organisatrice (facultative : un événement peut concerner toute la mission)
    church_id: Mapped[int | None] = mapped_column(
        ForeignKey("churches.id", ondelete="SET NULL"), default=None, index=True
    )
    district: Mapped[str | None] = mapped_column(String(50), default=None)
    capacity: Mapped[int | None] = mapped_column(Integer, default=None)
    show_registration_count: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, native_enum=False, length=20), default=EventStatus.draft
    )
    format: Mapped[EventFormat] = mapped_column(
        Enum(EventFormat, native_enum=False, length=20), default=EventFormat.presentiel
    )
    online_link: Mapped[str | None] = mapped_column(String(500), default=None)
    # Réglages propres à cet événement (remplacent l'ancien réglage global) :
    # délai (en heures) en dessous duquel l'annulation n'est plus possible, et
    # messages personnalisés (confirmation d'inscription / rappel), avec
    # variables de substitution {prenom}/{titre}/{date}/{delai}.
    cancel_deadline_hours: Mapped[int | None] = mapped_column(Integer, default=None)
    confirmation_message: Mapped[str | None] = mapped_column(Text, default=None)
    reminder_message: Mapped[str | None] = mapped_column(Text, default=None)
    # Utilisateur ayant créé l'événement (renseigné automatiquement) — sert à
    # restreindre les organisateurs à leurs propres événements.
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None, index=True
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
    reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False)

    event = relationship("Event", back_populates="registrations", lazy="select")
    member = relationship("Member", lazy="select")
