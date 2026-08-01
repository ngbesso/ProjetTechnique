from datetime import date

from pydantic import BaseModel


class FinanceTransaction(BaseModel):
    date: date
    type: str
    category: str
    amount: float
    currency: str
    party: str
    note: str
    attachment_url: str | None = None


class FinanceReport(BaseModel):
    period_start: str
    period_end: str
    income_cad: float
    income_usd: float
    expenses_total: float
    balance: float
    income_count: int
    expense_count: int
    transactions: list[FinanceTransaction]
