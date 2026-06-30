from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class DonationCategory(str, Enum):
    SOUTIEN_SPIRITUEL = "soutien_spirituel"
    ACTION_COMMUNAUTAIRE = "action_communautaire"
    DEVELOPPEMENT = "developpement"


class DonationCurrency(str, Enum):
    CAD = "CAD"
    USD = "USD"


class DonationCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Montant positif en dollars")
    currency: DonationCurrency = DonationCurrency.CAD
    category: DonationCategory
    church_id: int = Field(..., description="Identifiant de l'église destinataire")

    @field_validator("amount")
    @classmethod
    def round_two_decimals(cls, v: float) -> float:
        return round(v, 2)


class DonationRead(BaseModel):
    id: int
    receipt_number: str
    amount: float
    currency: DonationCurrency
    category: DonationCategory
    church_id: int
    member_id: int | None
    donor_name: str | None
    donor_email: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReceiptRead(BaseModel):
    receipt_number: str
    amount: float
    currency: DonationCurrency
    category: DonationCategory
    church_id: int
    donor_name: str
    donor_email: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
