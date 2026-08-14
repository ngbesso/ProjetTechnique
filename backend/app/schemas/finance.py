from datetime import date, datetime

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


class DonorAnnualReportEntry(BaseModel):
    donor_name: str
    donor_email: str | None
    # Devise de cette ligne : un même donateur ayant donné dans deux devises
    # obtient une ligne par devise, pour ne jamais mélanger les sommes.
    currency: str
    # 12 montants, janvier (indice 0) à décembre (indice 11).
    monthly_totals: list[float]
    annual_total: float
    donation_count: int


class DonorAnnualReport(BaseModel):
    year: int
    generated_at: datetime
    entries: list[DonorAnnualReportEntry]
