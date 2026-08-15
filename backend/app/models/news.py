import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class NewsStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class News(Base):
    __tablename__ = "news"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    excerpt: Mapped[str | None] = mapped_column(String(500), default=None)
    author: Mapped[str] = mapped_column(String(150))
    status: Mapped[NewsStatus] = mapped_column(
        Enum(NewsStatus, native_enum=False, length=20), default=NewsStatus.draft
    )
    category: Mapped[str | None] = mapped_column(String(100), default=None)
    cover_image_url: Mapped[str | None] = mapped_column(String(500), default=None)
    # Mise en avant sur le carrousel de la page d'accueil (curation manuelle) ;
    # position ordonne les items épinglés entre eux. Si moins de N sont épinglés,
    # l'endpoint /news/featured complète avec les plus récents (voir routes/news.py).
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    views: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), default=None
    )
