from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class ChurchBase(BaseModel):
    name: str
    district: str | None = None
    address: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    pastor_name: str | None = None
    representative: str | None = None
    founded_on: date | None = None


class ChurchCreate(ChurchBase):
    pass


class ChurchUpdate(BaseModel):
    name: str | None = None
    district: str | None = None
    address: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    pastor_name: str | None = None
    representative: str | None = None
    founded_on: date | None = None
    is_active: bool | None = None


class ChurchRead(ChurchBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    parent_id: int | None
    is_mother: bool
    is_active: bool
    created_at: datetime


class DistrictCount(BaseModel):
    district: str
    count: int


class ChurchAdminStats(BaseModel):
    total: int
    active: int
    inactive: int
    by_district: list[DistrictCount]
