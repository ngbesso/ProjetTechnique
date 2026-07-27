from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.news import NewsStatus


class NewsBase(BaseModel):
    title: str
    content: str
    excerpt: str | None = None
    author: str
    status: NewsStatus = NewsStatus.draft
    category: str | None = None
    cover_image_url: str | None = None
    is_featured: bool = False
    position: int = 0


class NewsCreate(NewsBase):
    pass


class NewsRead(NewsBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    views: int
    created_at: datetime
    updated_at: datetime | None


class NewsUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    excerpt: str | None = None
    author: str | None = None
    status: NewsStatus | None = None
    category: str | None = None
    cover_image_url: str | None = None
    is_featured: bool | None = None
    position: int | None = None
