from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.sermon import SermonFormat, SermonStatus


class SermonUpdate(BaseModel):
    title: str | None = None
    preacher: str | None = None
    sermon_date: date | None = None
    description: str | None = None
    series: str | None = None
    status: SermonStatus | None = None


class SermonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    preacher: str
    sermon_date: date
    description: str | None
    series: str | None
    format: SermonFormat
    status: SermonStatus
    duration_seconds: int | None
    views: int
    created_at: datetime


class SermonList(BaseModel):
    items: list[SermonRead]
    total: int
    limit: int
    offset: int


class TopSermonItem(BaseModel):
    id: int
    title: str
    preacher: str
    views: int


class SermonAdminStats(BaseModel):
    published: int
    draft: int
    total_views: int
    top_sermons: list[TopSermonItem]
