from datetime import datetime

from pydantic import BaseModel, Field

from app.models.prayer_request import PrayerRequestStatus


class PrayerRequestCreate(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class PrayerRequestRead(BaseModel):
    id: int
    member_id: int
    message: str
    status: PrayerRequestStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class PrayerRequestAdminRead(PrayerRequestRead):
    member_name: str
    member_email: str


class PrayerRequestUpdate(BaseModel):
    status: PrayerRequestStatus
