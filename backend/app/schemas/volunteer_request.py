from datetime import datetime

from pydantic import BaseModel, Field

from app.models.volunteer_request import VolunteerRequestStatus


class VolunteerRequestCreate(BaseModel):
    event_id: int
    message: str | None = Field(default=None, max_length=4000)


class VolunteerRequestRead(BaseModel):
    id: int
    member_id: int
    event_id: int
    event_title: str
    message: str | None
    status: VolunteerRequestStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class VolunteerRequestAdminRead(VolunteerRequestRead):
    member_name: str
    member_email: str


class VolunteerRequestUpdate(BaseModel):
    status: VolunteerRequestStatus
