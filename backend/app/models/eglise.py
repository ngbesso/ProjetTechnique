import enum
import uuid

from sqlalchemy import Enum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class District(enum.Enum):
    OUEST = "Ouest"
    EST = "Est"
    CENTRE = "Centre"
    SUD = "Sud"
    OUTREMER = "Outremer"


class Eglise(Base):
    __tablename__ = "eglises"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    district: Mapped[District] = mapped_column(Enum(District), nullable=False)
    adresse: Mapped[str | None] = mapped_column(String(500), nullable=True)

    membres: Mapped[list["Membre"]] = relationship("Membre", back_populates="eglise")
