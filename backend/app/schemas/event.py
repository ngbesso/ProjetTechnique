from datetime import datetime, timezone

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models.event import EventFormat, EventStatus, RegistrationStatus


class EventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    category: str
    date_start: datetime
    date_end: datetime | None = None
    location: str | None = None
    instructor: str | None = None
    intervenant_category: str | None = None
    price: float | None = Field(default=0, ge=0)
    zeffy_form_path: str | None = None
    church_id: int | None = None
    district: str | None = None
    capacity: int | None = Field(default=None, gt=0)
    show_registration_count: bool = True
    status: EventStatus = EventStatus.draft
    format: EventFormat = EventFormat.presentiel
    online_link: str | None = None
    cancel_deadline_hours: int | None = Field(default=None, ge=0)
    confirmation_message: str | None = None
    reminder_message: str | None = None

    @field_validator("date_start")
    @classmethod
    def date_start_not_in_past(cls, v: datetime) -> datetime:
        if v < datetime.now(timezone.utc):
            raise ValueError("La date de début ne peut pas être dans le passé")
        return v

    @field_validator("date_end")
    @classmethod
    def end_after_start(cls, v: datetime | None, info) -> datetime | None:
        start = info.data.get("date_start")
        if v is not None and start is not None and v < start:
            raise ValueError("La date de fin doit être postérieure à la date de début")
        return v

    @model_validator(mode="after")
    def format_requirements(self) -> "EventCreate":
        if self.format in (EventFormat.en_ligne, EventFormat.hybride) and not (
            self.online_link and self.online_link.strip()
        ):
            raise ValueError("Le lien de connexion est requis pour un événement en ligne ou hybride")
        if self.format == EventFormat.hybride and not (self.location and self.location.strip()):
            raise ValueError("Le lieu est requis pour un événement hybride")
        return self


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    category: str | None = None
    date_start: datetime | None = None
    date_end: datetime | None = None
    location: str | None = None
    instructor: str | None = None
    intervenant_category: str | None = None
    price: float | None = Field(default=None, ge=0)
    zeffy_form_path: str | None = None
    church_id: int | None = None
    district: str | None = None
    capacity: int | None = Field(default=None, gt=0)
    show_registration_count: bool | None = None
    status: EventStatus | None = None
    format: EventFormat | None = None
    online_link: str | None = None
    cancel_deadline_hours: int | None = Field(default=None, ge=0)
    confirmation_message: str | None = None
    reminder_message: str | None = None

    @model_validator(mode="after")
    def format_requirements(self) -> "EventUpdate":
        if self.format in (EventFormat.en_ligne, EventFormat.hybride) and not (
            self.online_link and self.online_link.strip()
        ):
            raise ValueError("Le lien de connexion est requis pour un événement en ligne ou hybride")
        if self.format == EventFormat.hybride and not (self.location and self.location.strip()):
            raise ValueError("Le lieu est requis pour un événement hybride")
        return self


class EventRead(BaseModel):
    id: int
    title: str
    description: str | None
    category: str
    date_start: datetime
    date_end: datetime | None
    location: str | None
    instructor: str | None
    intervenant_category: str | None
    price: float | None
    zeffy_form_path: str | None
    church_id: int | None
    district: str | None
    capacity: int | None
    show_registration_count: bool
    status: EventStatus
    format: EventFormat
    online_link: str | None
    cancel_deadline_hours: int | None
    confirmation_message: str | None
    reminder_message: str | None
    created_by: int | None
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


class ResendCancelLinkRequest(BaseModel):
    email: EmailStr


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
    # Renseigné uniquement pour un événement en ligne (inscription confirmée)
    online_link: str | None = None

    model_config = {"from_attributes": True}


class EventSummary(BaseModel):
    id: int
    title: str
    category: str
    date_start: datetime
    location: str | None
    format: EventFormat
    online_link: str | None = None

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
