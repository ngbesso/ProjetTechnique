from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.event import EventStatus, RegistrationStatus


class EventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    category: str
    date_start: datetime
    date_end: datetime | None = None
    location: str | None = None
    instructor: str | None = None
    price: float | None = Field(default=0, ge=0)
    church_id: int | None = None
    district: str | None = None
    capacity: int | None = Field(default=None, gt=0)
    status: EventStatus = EventStatus.draft

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
    category: str | None = None
    date_start: datetime | None = None
    date_end: datetime | None = None
    location: str | None = None
    instructor: str | None = None
    price: float | None = Field(default=None, ge=0)
    church_id: int | None = None
    district: str | None = None
    capacity: int | None = Field(default=None, gt=0)
    status: EventStatus | None = None


class EventRead(BaseModel):
    id: int
    title: str
    description: str | None
    category: str
    date_start: datetime
    date_end: datetime | None
    location: str | None
    instructor: str | None
    price: float | None
    church_id: int | None
    district: str | None
    capacity: int | None
    status: EventStatus
    created_at: datetime
    updated_at: datetime
    # Calculés à la volée par la route (pas des colonnes en base)
    registered_count: int
    spots_left: int | None
    image_url: str | None = None

    model_config = {"from_attributes": True}


class EventList(BaseModel):
    items: list[EventRead]
    total: int
    limit: int
    offset: int


class RegistrationCreate(BaseModel):
    """Invité (sans compte) : first_name/last_name/email requis.

    Membre connecté : ces champs sont ignorés, l'inscription est auto-remplie
    et liée à partir de son profil.
    """

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None

    model_config = {"extra": "ignore"}

    @field_validator("first_name", "last_name")
    @classmethod
    def strip_not_blank(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Ce champ ne peut pas être vide")
        return v


class RegistrationRead(BaseModel):
    id: int
    event_id: int
    member_id: int | None
    first_name: str
    last_name: str
    email: str
    registered_at: datetime
    status: RegistrationStatus

    model_config = {"from_attributes": True}


class EventSummary(BaseModel):
    id: int
    title: str
    category: str
    date_start: datetime
    location: str | None

    model_config = {"from_attributes": True}


class MyEventRegistration(BaseModel):
    id: int
    event_id: int
    registered_at: datetime
    event: EventSummary


class TopEventItem(BaseModel):
    id: int
    title: str
    category: str
    registered_count: int


class StatusBreakdownItem(BaseModel):
    status: EventStatus
    count: int


class EventStats(BaseModel):
    top_events: list[TopEventItem]
    status_breakdown: list[StatusBreakdownItem]
