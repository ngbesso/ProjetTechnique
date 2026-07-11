from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.post import PostStatus


class PostCreate(BaseModel):
    title: str
    content: str
    excerpt: str | None = None
    author: str
    status: PostStatus = PostStatus.draft
    category: str | None = None
    cover_image_url: str | None = None


class PostUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    excerpt: str | None = None
    author: str | None = None
    status: PostStatus | None = None
    category: str | None = None
    cover_image_url: str | None = None


class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    content: str
    excerpt: str | None
    author: str
    status: PostStatus
    category: str | None
    cover_image_url: str | None
    views: int
    created_at: datetime
    updated_at: datetime | None


class PostList(BaseModel):
    items: list[PostRead]
    total: int
    limit: int
    offset: int
