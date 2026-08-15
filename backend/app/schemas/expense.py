from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ExpenseCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Montant positif en dollars")
    expense_date: date
    category: str
    comment: str = Field(..., min_length=1, description="Justification obligatoire")
    church_id: int | None = None


class ExpenseUpdate(BaseModel):
    amount: float | None = Field(None, gt=0)
    expense_date: date | None = None
    category: str | None = None
    comment: str | None = Field(None, min_length=1)
    church_id: int | None = None


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    amount: float
    expense_date: date
    category: str
    church_id: int | None
    responsible_id: int
    responsible_email: str
    comment: str
    attachment_url: str | None
    attachment_name: str | None
    created_at: datetime


class ExpenseList(BaseModel):
    items: list[ExpenseRead]
    total: int
    limit: int
    offset: int


class ExpenseCategoryAmount(BaseModel):
    category: str
    total: float
    count: int


class ExpenseChurchAmount(BaseModel):
    church_id: int
    church_name: str
    total: float


class ExpenseAdminStats(BaseModel):
    total_amount: float
    count: int
    by_category: list[ExpenseCategoryAmount]
    top_churches: list[ExpenseChurchAmount]
