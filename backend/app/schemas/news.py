from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.news import NewsStatus


class NewsCreate(BaseModel):
    title: str
    content: str
    excerpt: str | None = None
    author: str
    status: NewsStatus = NewsStatus.draft
    category: str | None = None
    cover_image_url: str | None = None
    is_featured: bool = False
    position: int = 0


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


class NewsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    content: str
    excerpt: str | None
    author: str
    status: NewsStatus
    category: str | None
    cover_image_url: str | None
    is_featured: bool
    position: int
    views: int
    created_at: datetime
    updated_at: datetime | None


class NewsList(BaseModel):
    items: list[NewsRead]
    total: int
    limit: int
    offset: int


class TopNewsItem(BaseModel):
    id: int
    title: str
    views: int


class NewsAdminStats(BaseModel):
    published: int
    draft: int
    archived: int
    featured_count: int
    total_views: int
    top_news: list[TopNewsItem]
