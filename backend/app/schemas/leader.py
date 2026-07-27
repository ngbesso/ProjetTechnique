from datetime import datetime

from pydantic import BaseModel, Field

from app.models.leader import LeaderRole


class LeaderCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    title: str = Field(..., min_length=1, max_length=150)
    role: LeaderRole
    district: str | None = None
    church_id: int | None = None
    bio: str | None = None
    email: str | None = None
    phone: str | None = None
    years_of_service: int | None = Field(default=None, ge=0)
    is_published: bool = True
    order_index: int = 0


class LeaderUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    title: str | None = Field(default=None, min_length=1, max_length=150)
    role: LeaderRole | None = None
    district: str | None = None
    church_id: int | None = None
    bio: str | None = None
    email: str | None = None
    phone: str | None = None
    years_of_service: int | None = Field(default=None, ge=0)
    is_published: bool | None = None
    order_index: int | None = None


class LeaderRead(BaseModel):
    id: int
    first_name: str
    last_name: str
    title: str
    role: LeaderRole
    district: str | None
    church_id: int | None
    bio: str | None
    email: str | None
    phone: str | None
    years_of_service: int | None
    is_published: bool
    order_index: int
    created_at: datetime
    updated_at: datetime
    # Calculé à la volée par la route à partir de photo_key (pas une colonne en base)
    photo_url: str | None = None

    model_config = {"from_attributes": True}


class LeaderList(BaseModel):
    items: list[LeaderRead]
    total: int
    limit: int
    offset: int


class LeaderRoleCount(BaseModel):
    role: str
    count: int


class LeaderDistrictCount(BaseModel):
    district: str
    count: int


class LeaderAdminStats(BaseModel):
    total: int
    published: int
    by_role: list[LeaderRoleCount]
    by_district: list[LeaderDistrictCount]
