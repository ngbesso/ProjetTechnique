from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.sermon import SermonFormat, SermonStatus


class SermonBase(BaseModel):
    title: str
    preacher: str
    sermon_date: date
    description: str | None = None
    series: str | None = None
    status: SermonStatus = SermonStatus.draft


class SermonRead(SermonBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    format: SermonFormat
    duration_seconds: int | None
    views: int
    created_at: datetime


class SermonUpdate(BaseModel):
    title: str | None = None
    preacher: str | None = None
    sermon_date: date | None = None
    description: str | None = None
    series: str | None = None
    status: SermonStatus | None = None


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
