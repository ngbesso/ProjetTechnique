from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.donation import Donation, DonationCurrency
from app.models.expense import Expense
from app.schemas.finance import FinanceReport, FinanceTransaction

_NO_BOUND = "Toutes dates"


def resolve_period(
    period: str | None, start: date | None, end: date | None
) -> tuple[date | None, date | None]:
    """Résout un préréglage de période (jour/semaine/mois/année) en bornes de
    dates ; `custom`/absence de préréglage laisse `start`/`end` tels quels
    (bornes ouvertes si non fournies)."""
    if not period or period == "custom":
        return start, end

    today = datetime.now(timezone.utc).date()
    if period == "day":
        return today, today
    if period == "week":
        return today - timedelta(days=today.weekday()), today
    if period == "month":
        return today.replace(day=1), today
    if period == "year":
        return today.replace(month=1, day=1), today
    raise ValueError(f"Période inconnue : {period}")


def build_report(db: Session, start: date | None, end: date | None) -> FinanceReport:
    """Calcule le résumé (revenus/dépenses/solde) et le détail des transactions
    pour la période donnée (bornes incluses ; non fournies = illimité)."""
    donation_query = select(Donation).options(selectinload(Donation.member))
    if start:
        donation_query = donation_query.where(Donation.created_at >= start)
    if end:
        donation_query = donation_query.where(
            Donation.created_at < end + timedelta(days=1)
        )
    donations = db.scalars(donation_query).all()

    expense_query = select(Expense).options(selectinload(Expense.responsible))
    if start:
        expense_query = expense_query.where(Expense.expense_date >= start)
    if end:
        expense_query = expense_query.where(Expense.expense_date <= end)
    expenses = db.scalars(expense_query).all()

    income_cad = sum(
        float(d.amount) for d in donations if d.currency == DonationCurrency.CAD
    )
    income_usd = sum(
        float(d.amount) for d in donations if d.currency == DonationCurrency.USD
    )
    expenses_total = sum(float(e.amount) for e in expenses)

    transactions: list[FinanceTransaction] = []
    for d in donations:
        if d.member_id and d.member:
            party = d.member.full_name
        else:
            party = d.donor_name or d.donor_email or "Anonyme"
        transactions.append(
            FinanceTransaction(
                date=d.created_at.date(),
                type="revenu",
                category=d.contribution_type,
                amount=float(d.amount),
                currency=d.currency.value,
                party=party,
                note=d.receipt_number,
                attachment_url=d.attachment_url,
            )
        )
    for e in expenses:
        transactions.append(
            FinanceTransaction(
                date=e.expense_date,
                type="dépense",
                category=e.category,
                amount=float(e.amount),
                currency="CAD",
                party=e.responsible.email,
                note=e.comment,
                attachment_url=e.attachment_url,
            )
        )
    transactions.sort(key=lambda t: t.date, reverse=True)

    return FinanceReport(
        period_start=start.isoformat() if start else _NO_BOUND,
        period_end=end.isoformat() if end else _NO_BOUND,
        income_cad=income_cad,
        income_usd=income_usd,
        expenses_total=expenses_total,
        balance=income_cad - expenses_total,
        income_count=len(donations),
        expense_count=len(expenses),
        transactions=transactions,
    )
