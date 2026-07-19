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


class ZeffyWebhookPayload(BaseModel):
    """Payload envoyé par le webhook natif Zeffy (Réglages > Intégrations).

    Zeffy ne documente pas un schéma strict champ par champ ; on ne retient
    que ce dont on a besoin et on ignore le reste pour tolérer les évolutions
    de leur format.
    """

    event: str | None = None
    payment: dict | None = None

    model_config = {"extra": "ignore"}


class DonationRead(BaseModel):
    id: int
    receipt_number: str
    amount: float
    currency: DonationCurrency
    category: DonationCategory | None
    church_id: int | None
    member_id: int | None
    donor_name: str | None
    donor_email: str | None
    payment_reference: str | None
    payment_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CategoryCount(BaseModel):
    category: str
    count: int


class TopDonorItem(BaseModel):
    name: str
    total: float
    count: int


class TopChurchItem(BaseModel):
    church_id: int
    church_name: str
    total: float


class DonationAdminStats(BaseModel):
    total_cad: float
    total_usd: float
    by_category: list[CategoryCount]
    top_donors: list[TopDonorItem]
    top_churches: list[TopChurchItem]


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
