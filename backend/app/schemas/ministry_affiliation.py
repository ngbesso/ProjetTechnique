from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class MinistryAffiliationCreate(BaseModel):
    ministry: str


class MinistryAffiliationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    member_id: int
    ministry: str
    joined_at: date
    left_at: date | None
    created_at: datetime


class MinistryMemberRead(BaseModel):
    """Membre actuellement affilié à un ministère donné (rapport)."""

    id: int
    first_name: str
    last_name: str
    email: str
    affiliation_id: int
    joined_at: date


class MinistryBulkAddRequest(BaseModel):
    member_ids: list[int]


class MinistryBulkAddResult(BaseModel):
    added: list[int]
    skipped: list[int]


class MinistryCount(BaseModel):
    ministry: str
    active_count: int


class MinistryAdminStats(BaseModel):
    total_active: int
    ministries_count: int
    by_ministry: list[MinistryCount]
