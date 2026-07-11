import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PostStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    excerpt: Mapped[str | None] = mapped_column(String(500), default=None)
    author: Mapped[str] = mapped_column(String(150))
    status: Mapped[PostStatus] = mapped_column(
        Enum(PostStatus, native_enum=False, length=20), default=PostStatus.draft
    )
    category: Mapped[str | None] = mapped_column(String(100), default=None)
    cover_image_url: Mapped[str | None] = mapped_column(String(500), default=None)
    views: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), default=None
    )
