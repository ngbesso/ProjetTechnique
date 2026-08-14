from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.donation import Donation, DonationCurrency
from app.models.expense import Expense
from app.schemas.finance import (
    DonorAnnualReport,
    DonorAnnualReportEntry,
    FinanceReport,
    FinanceTransaction,
)

_NO_BOUND = "Toutes dates"

# Abrégés (mêmes libellés que le tableau du panneau admin) : avec 17 colonnes
# au total (donateur, courriel, devise, 12 mois, total, nombre de dons), les
# noms de mois complets font déborder ou mal retourner à la ligne les en-têtes
# des fichiers exportés (PDF surtout).
MONTH_LABELS_FR = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
    "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
]
# Libellé neutre pour un don sans catégorie assignée — jamais écrit en base
# (ni pour les anciens dons, ni pour les futurs dons Zeffy : le webhook ne
# transmet pas de catégorie, et fabriquer une valeur pour un vrai don serait
# trompeur). Purement un repli d'affichage, appliqué de façon identique quelle
# que soit l'ancienneté du don.
_UNCATEGORIZED_LABEL = "Dons"


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
                category=d.category.value if d.category else _UNCATEGORIZED_LABEL,
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


def build_annual_donor_report(db: Session, year: int) -> DonorAnnualReport:
    """Rapport annuel des dons par personne, réparti par mois (toutes les
    églises confondues). Un même donateur ayant donné en CAD et en USD obtient
    une ligne par devise, pour ne jamais mélanger les sommes (même règle que
    build_report ci-dessus)."""
    start = date(year, 1, 1)
    end = date(year + 1, 1, 1)
    donations = db.scalars(
        select(Donation)
        .options(selectinload(Donation.member), selectinload(Donation.donor))
        .where(Donation.created_at >= start, Donation.created_at < end)
    ).all()

    groups: dict[tuple[str, str], dict] = {}
    for d in donations:
        if d.member_id and d.member:
            key = f"member:{d.member_id}"
            name = d.member.full_name
            email = d.member.email
        elif d.donor_id and d.donor:
            key = f"donor:{d.donor_id}"
            name = d.donor.name
            email = d.donor.email
        else:
            name = d.donor_name or d.donor_email or "Anonyme"
            key = f"name:{name.lower()}"
            email = d.donor_email

        currency = d.currency.value if hasattr(d.currency, "value") else d.currency
        entry = groups.setdefault(
            (key, currency),
            {
                "donor_name": name,
                "donor_email": email,
                "currency": currency,
                "monthly_totals": [0.0] * 12,
                "donation_count": 0,
            },
        )
        entry["monthly_totals"][d.created_at.month - 1] += float(d.amount)
        entry["donation_count"] += 1

    entries = [
        DonorAnnualReportEntry(
            donor_name=g["donor_name"],
            donor_email=g["donor_email"],
            currency=g["currency"],
            monthly_totals=g["monthly_totals"],
            annual_total=sum(g["monthly_totals"]),
            donation_count=g["donation_count"],
        )
        for g in groups.values()
    ]
    entries.sort(key=lambda e: e.annual_total, reverse=True)

    return DonorAnnualReport(
        year=year,
        generated_at=datetime.now(timezone.utc),
        entries=entries,
    )
