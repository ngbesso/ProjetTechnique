from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.formation import FormationStatus


class FormationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    instructor: str = Field(min_length=1, max_length=150)
    formation_date: date
    price: float = Field(ge=0)
    capacity: int = Field(ge=1)
    description: str | None = None
    status: FormationStatus = FormationStatus.draft

    @field_validator("title", "instructor")
    @classmethod
    def strip_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Ce champ ne peut pas être vide")
        return v

    @field_validator("formation_date")
    @classmethod
    def date_not_past(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("La date de la formation doit être une date à venir")
        return v


class FormationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    instructor: str | None = Field(default=None, min_length=1, max_length=150)
    formation_date: date | None = None
    price: float | None = Field(default=None, ge=0)
    capacity: int | None = Field(default=None, ge=1)
    description: str | None = None
    status: FormationStatus | None = None

    @field_validator("formation_date")
    @classmethod
    def date_not_past(cls, v: date | None) -> date | None:
        if v is not None and v < date.today():
            raise ValueError("La date de la formation doit être une date à venir")
        return v


class FormationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str | None
    instructor: str
    formation_date: date
    price: float
    capacity: int
    status: FormationStatus
    registered_count: int = 0
    created_at: datetime


class RegistrationCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr

    @field_validator("first_name", "last_name")
    @classmethod
    def strip_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Ce champ ne peut pas être vide")
        return v


class RegistrationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    formation_id: int
    first_name: str
    last_name: str
    email: str
    created_at: datetime


class FormationList(BaseModel):
    items: list[FormationRead]
    total: int
    limit: int
    offset: int


class FormationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    formation_date: date
    price: float
    instructor: str


class RegistrationWithFormation(BaseModel):
    id: int
    formation_id: int
    created_at: datetime
    formation: FormationSummary
