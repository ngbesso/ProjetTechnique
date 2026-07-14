from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


def _no_future_date(v: date | None, field_name: str) -> date | None:
    if v is not None and v > date.today():
        raise ValueError(f"La {field_name} ne peut pas être une date future.")
    return v


class MembershipRequest(BaseModel):
    church_id: int
    first_name: str
    last_name: str
    email: EmailStr
    address: str | None = None
    birth_date: date | None = None
    sexe: str | None = None
    telephone: str | None = None
    family_status: str | None = None
    is_baptized: bool = False

    @field_validator("birth_date")
    @classmethod
    def birth_date_not_future(cls, v: date | None) -> date | None:
        return _no_future_date(v, "date de naissance")

    @field_validator("telephone")
    @classmethod
    def telephone_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) < 7:
            raise ValueError(
                "Le numéro de téléphone doit contenir au moins 7 chiffres."
            )
        return v


class MemberCreate(MembershipRequest):
    conversion_date: date | None = None

    @field_validator("conversion_date")
    @classmethod
    def conversion_date_not_future(cls, v: date | None) -> date | None:
        return _no_future_date(v, "date de conversion")


class MemberUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    address: str | None = None
    birth_date: date | None = None
    sexe: str | None = None
    telephone: str | None = None
    family_status: str | None = None
    conversion_date: date | None = None
    is_baptized: bool | None = None

    @field_validator("birth_date")
    @classmethod
    def birth_date_not_future(cls, v: date | None) -> date | None:
        return _no_future_date(v, "date de naissance")

    @field_validator("conversion_date")
    @classmethod
    def conversion_date_not_future(cls, v: date | None) -> date | None:
        return _no_future_date(v, "date de conversion")

    @field_validator("telephone")
    @classmethod
    def telephone_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) < 7:
            raise ValueError(
                "Le numéro de téléphone doit contenir au moins 7 chiffres."
            )
        return v


class MemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    church_id: int
    first_name: str
    last_name: str
    email: EmailStr
    address: str | None
    birth_date: date | None
    sexe: str | None
    telephone: str | None
    family_status: str | None
    conversion_date: date | None
    is_baptized: bool
    member_code: str | None
    status: str
    created_at: datetime


class MemberList(BaseModel):
    items: list[MemberRead]
    total: int
    limit: int
    offset: int


class MemberImportRowError(BaseModel):
    row: int
    email: str | None = None
    message: str


class MemberImportResult(BaseModel):
    created: int
    errors: list[MemberImportRowError]


class MemberSelfUpdate(BaseModel):
    """Auto-service : un membre ne peut modifier que ses coordonnées.

    Identité (nom, prénom, date de naissance) et courriel de connexion
    restent réservés à la gestion administrative (contact avec l'église).
    """

    address: str | None = None
    sexe: str | None = None
    telephone: str | None = None
    family_status: str | None = None

    @field_validator("telephone")
    @classmethod
    def telephone_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) < 7:
            raise ValueError(
                "Le numéro de téléphone doit contenir au moins 7 chiffres."
            )
        return v
