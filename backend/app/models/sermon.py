import enum
import uuid
from datetime import date, datetime

from sqlalchemy import ARRAY, Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class FormatSermon(enum.Enum):
    AUDIO = "audio"
    VIDEO = "video"


class StatutSermon(enum.Enum):
    BROUILLON = "brouillon"
    PUBLIE = "publie"
    ARCHIVE = "archive"


class Sermon(Base):
    __tablename__ = "sermons"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    titre: Mapped[str] = mapped_column(String(255), nullable=False)
    predicateur: Mapped[str] = mapped_column(String(255), nullable=False)
    date_sermon: Mapped[date | None] = mapped_column(Date, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    serie: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list
    )

    # Lien vers le fichier dans MinIO — jamais une URL directe
    fichier_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    format: Mapped[FormatSermon] = mapped_column(
        Enum(FormatSermon), nullable=False, default=FormatSermon.AUDIO
    )
    duree_secondes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    statut: Mapped[StatutSermon] = mapped_column(
        Enum(StatutSermon), nullable=False, default=StatutSermon.BROUILLON
    )
    vues: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    uploader: Mapped["User"] = relationship(
        "User", back_populates="sermons", foreign_keys=[uploaded_by]
    )
