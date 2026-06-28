from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.member import MemberStatus


class MembershipRequest(BaseModel):
    church_id: int
    first_name: str
    last_name: str
    email: EmailStr
    address: str | None = None
    birth_date: date | None = None
    family_status: str | None = None
    is_baptized: bool = False


class MemberCreate(MembershipRequest):
    conversion_date: date | None = None


class MemberUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    address: str | None = None
    birth_date: date | None = None
    family_status: str | None = None
    conversion_date: date | None = None
    is_baptized: bool | None = None


class MemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    church_id: int
    first_name: str
    last_name: str
    email: EmailStr
    address: str | None
    birth_date: date | None
    family_status: str | None
    conversion_date: date | None
    is_baptized: bool
    status: MemberStatus
    created_at: datetime


class MemberList(BaseModel):
    items: list[MemberRead]
    total: int
    limit: int
    offset: int