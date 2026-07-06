import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SermonFormat(str, enum.Enum):
    audio = "audio"
    video = "video"


class SermonStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class Sermon(Base):
    __tablename__ = "sermons"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    preacher: Mapped[str] = mapped_column(String(150))
    sermon_date: Mapped[date] = mapped_column(Date)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    series: Mapped[str | None] = mapped_column(String(150), default=None)
    format: Mapped[SermonFormat] = mapped_column(
        Enum(SermonFormat, native_enum=False, length=10)
    )
    file_key: Mapped[str] = mapped_column(String(500))
    duration_seconds: Mapped[int | None] = mapped_column(Integer, default=None)
    status: Mapped[SermonStatus] = mapped_column(
        Enum(SermonStatus, native_enum=False, length=20), default=SermonStatus.draft
    )
    views: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
