from datetime import datetime

from pydantic import BaseModel, Field

from app.models.member_request import MemberRequestStatus


class MemberRequestCreate(BaseModel):
    request_type: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=4000)


class MemberRequestRead(BaseModel):
    id: int
    member_id: int
    request_type: str
    message: str
    status: MemberRequestStatus
    admin_response: str | None
    created_at: datetime
    resolved_at: datetime | None

    model_config = {"from_attributes": True}


class MemberRequestAdminRead(MemberRequestRead):
    member_name: str
    member_email: str
    handled_by: int | None = None
    handled_by_email: str | None = None


class MemberRequestUpdate(BaseModel):
    status: MemberRequestStatus
    admin_response: str | None = Field(default=None, max_length=4000)


class MemberRequestAdminStats(BaseModel):
    new: int
    in_progress: int
    resolved: int
    total: int
