from datetime import datetime

from pydantic import BaseModel, Field


class DonorCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: str | None = None


class DonorRead(BaseModel):
    id: int
    name: str
    email: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
