from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.event import RegistrationStatus


class EventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    date_start: datetime
    date_end: datetime | None = None
    location: str | None = None
    church_id: int | None = None
    district: str | None = None
    max_participants: int | None = Field(default=None, gt=0)
    is_published: bool = False

    @field_validator("date_end")
    @classmethod
    def end_after_start(cls, v: datetime | None, info) -> datetime | None:
        start = info.data.get("date_start")
        if v is not None and start is not None and v < start:
            raise ValueError("La date de fin doit être postérieure à la date de début")
        return v


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    date_start: datetime | None = None
    date_end: datetime | None = None
    location: str | None = None
    church_id: int | None = None
    district: str | None = None
    max_participants: int | None = Field(default=None, gt=0)
    is_published: bool | None = None


class EventRead(BaseModel):
    id: int
    title: str
    description: str | None
    date_start: datetime
    date_end: datetime | None
    location: str | None
    church_id: int | None
    district: str | None
    max_participants: int | None
    is_published: bool
    created_at: datetime
    updated_at: datetime
    # Calculés à la volée par la route (pas des colonnes en base)
    registered_count: int
    spots_left: int | None

    model_config = {"from_attributes": True}


class EventList(BaseModel):
    items: list[EventRead]
    total: int
    limit: int
    offset: int


class RegistrationCreate(BaseModel):
    """Corps optionnel : l'événement vient de l'URL, le membre du JWT.

    Vide pour l'instant — réservé si un champ (ex. note) devait s'ajouter.
    """

    model_config = {"extra": "ignore"}


class RegistrationRead(BaseModel):
    id: int
    event_id: int
    member_id: int
    registered_at: datetime
    status: RegistrationStatus
    member_name: str | None = None
    member_email: str | None = None

    model_config = {"from_attributes": True}


class EventSummary(BaseModel):
    id: int
    title: str
    date_start: datetime
    location: str | None

    model_config = {"from_attributes": True}


class MyEventRegistration(BaseModel):
    id: int
    event_id: int
    registered_at: datetime
    event: EventSummary
