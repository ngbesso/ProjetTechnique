from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Church(Base):
    __tablename__ = "churches"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("churches.id", ondelete="CASCADE"), default=None
    )
    district: Mapped[str | None] = mapped_column(String(50), default=None)
    address: Mapped[str | None] = mapped_column(String(255), default=None)
    phone: Mapped[str | None] = mapped_column(String(50), default=None)
    email: Mapped[str | None] = mapped_column(String(255), default=None)
    pastor_name: Mapped[str | None] = mapped_column(String(150), default=None)
    representative: Mapped[str | None] = mapped_column(String(150), default=None)
    founded_on: Mapped[date | None] = mapped_column(Date, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    parent: Mapped["Church | None"] = relationship(remote_side="Church.id")

    @property
    def is_mother(self) -> bool:
        return self.parent_id is None
