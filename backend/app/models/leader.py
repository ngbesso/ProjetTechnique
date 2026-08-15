from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Leader(Base):
    __tablename__ = "leaders"

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(150))
    # Valeur libre alimentée par ParameterValue (category="leader_role"), sur
    # le même modèle que Event.category / Member.sexe.
    role: Mapped[str] = mapped_column(String(50))
    # District libre (Ouest/Est/Centre/Sud/Outremer/National) — comme Church.district,
    # pas d'enum en base pour rester cohérent avec le reste du projet.
    district: Mapped[str | None] = mapped_column(String(50), default=None)
    # Église de rattachement (facultative : un responsable national n'en a pas)
    church_id: Mapped[int | None] = mapped_column(
        ForeignKey("churches.id", ondelete="SET NULL"), default=None, index=True
    )
    bio: Mapped[str | None] = mapped_column(Text, default=None)
    # Clé de l'objet dans MinIO ; l'URL présignée est calculée à la volée par la
    # route (même logique que Event.image_key → EventRead.image_url).
    photo_key: Mapped[str | None] = mapped_column(String(500), default=None)
    email: Mapped[str | None] = mapped_column(String(255), default=None)
    phone: Mapped[str | None] = mapped_column(String(50), default=None)
    years_of_service: Mapped[int | None] = mapped_column(Integer, default=None)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    church = relationship("Church", lazy="select")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
