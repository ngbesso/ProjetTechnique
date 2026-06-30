from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.donation import DonationCategory, DonationCurrency


class DonationCreate(BaseModel):
    amount: float
    currency: DonationCurrency = DonationCurrency.CAD
    category: DonationCategory
    donor_name: Optional[str] = None
    donor_email: Optional[str] = None
    member_id: Optional[int] = None


class DonationRead(BaseModel):
    id: int
    receipt_number: str
    amount: float
    currency: str
    category: str
    donor_name: Optional[str] = None
    donor_email: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReceiptRead(BaseModel):
    receipt_number: str
    amount: float
    currency: str
    donor_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
