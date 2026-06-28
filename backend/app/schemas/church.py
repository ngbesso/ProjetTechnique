from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr

District = Literal["Ouest", "Est", "Centre", "Sud", "Outremer"]


class ChurchBase(BaseModel):
    name: str
    district: District | None = None
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
    district: District | None = None
    address: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    pastor_name: str | None = None
    representative: str | None = None
    founded_on: date | None = None


class ChurchRead(ChurchBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    parent_id: int | None
    is_mother: bool
    created_at: datetime
