import re
from datetime import date, datetime, timezone

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

# Mêmes caractères autorisés que lib/validation.ts (validatePhoneFormat) côté
# frontend — la validation de format doit être identique des deux côtés.
_PHONE_CHARS = re.compile(r"^[+\d\s\-.()\[\]]+$")


def _validate_telephone(v: str | None) -> str | None:
    """Rejette tout caractère qui n'a jamais sa place dans un numéro (lettres,
    symboles...), puis exige au moins 7 chiffres. Partagé par tous les schémas
    qui exposent ce champ pour éviter que la règle diverge entre eux."""
    if v is None:
        return v
    if not _PHONE_CHARS.match(v):
        raise ValueError(
            "Le téléphone ne peut contenir que des chiffres, espaces, tirets, "
            "parenthèses ou le signe +."
        )
    digits = "".join(c for c in v if c.isdigit())
    if len(digits) < 7:
        raise ValueError("Le numéro de téléphone doit contenir au moins 7 chiffres.")
    return v


def _validate_human_name(v: str, field_label: str) -> str:
    """Rejette un nom composé uniquement de chiffres/symboles (ex. "12345") :
    au moins une lettre est requise, sans interdire tirets, apostrophes ou
    espaces (ex. "Jean-Pierre", "O'Brien")."""
    if not any(c.isalpha() for c in v):
        raise ValueError(f"Le {field_label} doit contenir au moins une lettre.")
    return v


def _no_future_date(v: date | None, field_name: str) -> date | None:
    """Rejette une date postérieure à aujourd'hui. Le jour même reste accepté :
    une conversion peut légitimement être enregistrée le jour où elle a lieu."""
    if v is not None and v > datetime.now(timezone.utc).date():
        raise ValueError(f"La {field_name} ne peut pas être une date future.")
    return v


def _birth_date_in_past(v: date | None) -> date | None:
    """Règle propre à la date de naissance : contrairement à _no_future_date,
    le jour même est refusé (un membre inscrit le jour de sa naissance n'a pas
    de sens dans le registre)."""
    if v is not None and v >= datetime.now(timezone.utc).date():
        raise ValueError("La date de naissance doit être antérieure à aujourd'hui.")
    return v


class MembershipRequest(BaseModel):
    church_id: int
    first_name: str
    last_name: str
    email: EmailStr
    address: str | None = None
    birth_date: date | None = None
    sexe: str
    telephone: str | None = None
    family_status: str | None = None
    is_baptized: bool = False

    @field_validator("first_name")
    @classmethod
    def first_name_has_letter(cls, v: str) -> str:
        return _validate_human_name(v, "prénom")

    @field_validator("last_name")
    @classmethod
    def last_name_has_letter(cls, v: str) -> str:
        return _validate_human_name(v, "nom")

    @field_validator("birth_date")
    @classmethod
    def birth_date_is_past(cls, v: date | None) -> date | None:
        return _birth_date_in_past(v)

    @field_validator("telephone")
    @classmethod
    def telephone_format(cls, v: str | None) -> str | None:
        return _validate_telephone(v)


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

    @field_validator("first_name")
    @classmethod
    def first_name_has_letter(cls, v: str | None) -> str | None:
        return _validate_human_name(v, "prénom") if v is not None else v

    @field_validator("last_name")
    @classmethod
    def last_name_has_letter(cls, v: str | None) -> str | None:
        return _validate_human_name(v, "nom") if v is not None else v

    @field_validator("birth_date")
    @classmethod
    def birth_date_is_past(cls, v: date | None) -> date | None:
        return _birth_date_in_past(v)

    @field_validator("conversion_date")
    @classmethod
    def conversion_date_not_future(cls, v: date | None) -> date | None:
        return _no_future_date(v, "date de conversion")

    @field_validator("telephone")
    @classmethod
    def telephone_format(cls, v: str | None) -> str | None:
        return _validate_telephone(v)


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


class MemberStatusStats(BaseModel):
    active: int
    pending: int
    inactive: int
    rejected: int


class MemberImportRowError(BaseModel):
    row: int
    email: str | None = None
    message: str


class MemberImportResult(BaseModel):
    created: int
    errors: list[MemberImportRowError]


class MemberBirthday(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: str
    birth_date: date


class BirthdaysOverview(BaseModel):
    today: list[MemberBirthday]
    this_month: list[MemberBirthday]


class BirthdayGreetingsSendResult(BaseModel):
    sent: int


class MemberApproveAllResult(BaseModel):
    approved: int


class MemberSelfUpdate(BaseModel):
    """Auto-service : un membre ne peut modifier que ses coordonnées.

    Identité (nom, prénom, date de naissance), sexe et courriel de connexion
    restent réservés à la gestion administrative (contact avec l'église).
    """

    address: str | None = None
    telephone: str | None = None
    family_status: str | None = None

    @field_validator("telephone")
    @classmethod
    def telephone_format(cls, v: str | None) -> str | None:
        return _validate_telephone(v)
