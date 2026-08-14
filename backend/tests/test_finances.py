from datetime import date, datetime, timezone

from sqlalchemy import select

from app.models.church import Church
from app.models.donation import (
    ContributionType,
    Donation,
    DonationCategory,
    DonationCurrency,
)
from app.models.donor import Donor
from app.models.expense import Expense
from app.models.user import User

BASE = "/finances"

# Plage isolée dans le passé : ne peut jamais chevaucher les données de
# démonstration (seed_expenses(), toujours datées par rapport à "maintenant")
# insérées hors transaction au démarrage de l'app — même contrainte que pour
# le carrousel d'actualités (voir test_news.py).
PAST_START = "2020-01-01"
PAST_END = "2020-01-31"
PAST_DATE = date(2020, 1, 15)
PAST_DATETIME = datetime(2020, 1, 15, tzinfo=timezone.utc)


def _admin_header(make_user, auth_header):
    make_user("admin_fin@test.com", roles=["admin"])
    return auth_header("admin_fin@test.com")


def _donation(
    db_session,
    amount,
    currency=DonationCurrency.CAD,
    contribution_type=ContributionType.DON,
    category=None,
    donor_name="Testeur",
    donor_email=None,
    created_at=PAST_DATETIME,
    member_id=None,
    donor_id=None,
):
    d = Donation(
        amount=amount,
        currency=currency,
        contribution_type=contribution_type,
        category=category,
        donor_name=donor_name,
        donor_email=donor_email,
        created_at=created_at,
        member_id=member_id,
        donor_id=donor_id,
    )
    db_session.add(d)
    db_session.flush()
    return d


def _expense(
    db_session,
    responsible_id,
    amount,
    category="Test",
    comment="Justification de test.",
    expense_date=PAST_DATE,
):
    e = Expense(
        amount=amount,
        expense_date=expense_date,
        category=category,
        comment=comment,
        responsible_id=responsible_id,
    )
    db_session.add(e)
    db_session.flush()
    return e


# ── Permissions ───────────────────────────────────────────────────────────────


def test_report_requires_auth(client):
    r = client.get(f"{BASE}/report")
    assert r.status_code == 401


def test_report_requires_finance_permission(client, make_user, auth_header):
    make_user("regular_fin@test.com")
    r = client.get(f"{BASE}/report", headers=auth_header("regular_fin@test.com"))
    assert r.status_code == 403


# ── Calcul revenus / dépenses / solde ─────────────────────────────────────────


def test_report_computes_income_expenses_and_balance(
    client, make_user, auth_header, db_session
):
    h = _admin_header(make_user, auth_header)
    admin_id = db_session.scalar(
        select(User.id).where(User.email == "admin_fin@test.com")
    )
    _donation(db_session, 100.0)
    _expense(db_session, admin_id, 40.0)

    r = client.get(f"{BASE}/report?start={PAST_START}&end={PAST_END}", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert body["income_cad"] == 100.0
    assert body["expenses_total"] == 40.0
    assert body["balance"] == 60.0
    assert body["income_count"] == 1
    assert body["expense_count"] == 1
    assert len(body["transactions"]) == 2


def test_report_excludes_usd_income_from_balance(
    client, make_user, auth_header, db_session
):
    h = _admin_header(make_user, auth_header)
    _donation(db_session, 100.0, currency=DonationCurrency.CAD)
    _donation(db_session, 30.0, currency=DonationCurrency.USD)

    r = client.get(f"{BASE}/report?start={PAST_START}&end={PAST_END}", headers=h)
    body = r.json()
    assert body["income_cad"] == 100.0
    assert body["income_usd"] == 30.0
    assert body["balance"] == 100.0


def test_report_transaction_shows_donation_category_and_comment(
    client, make_user, auth_header, db_session
):
    h = _admin_header(make_user, auth_header)
    admin_id = db_session.scalar(
        select(User.id).where(User.email == "admin_fin@test.com")
    )
    _donation(
        db_session,
        75.0,
        category=DonationCategory.SOUTIEN_SPIRITUEL,
        donor_name="Dîme Fidèle",
    )
    _expense(db_session, admin_id, 20.0, comment="Achat de chaises pour la salle.")

    r = client.get(f"{BASE}/report?start={PAST_START}&end={PAST_END}", headers=h)
    transactions = r.json()["transactions"]

    income_tx = next(t for t in transactions if t["type"] == "revenu")
    assert income_tx["category"] == "soutien_spirituel"
    assert income_tx["party"] == "Dîme Fidèle"

    expense_tx = next(t for t in transactions if t["type"] == "dépense")
    assert expense_tx["note"] == "Achat de chaises pour la salle."


def test_report_transaction_uncategorized_donation_shows_dons_label(
    client, make_user, auth_header, db_session
):
    """Un don sans catégorie (ex. reçu via le webhook Zeffy, qui n'en transmet
    pas) doit s'afficher sous un libellé neutre plutôt que le nom brut du
    champ interne (contribution_type) ou un vide déroutant."""
    h = _admin_header(make_user, auth_header)
    _donation(db_session, 50.0)  # pas de category assignée

    r = client.get(f"{BASE}/report?start={PAST_START}&end={PAST_END}", headers=h)
    income_tx = next(t for t in r.json()["transactions"] if t["type"] == "revenu")
    assert income_tx["category"] == "Dons"


def test_report_transaction_includes_attachment_url(
    client, make_user, auth_header, db_session
):
    h = _admin_header(make_user, auth_header)
    admin_id = db_session.scalar(
        select(User.id).where(User.email == "admin_fin@test.com")
    )
    d = _donation(db_session, 40.0)
    d.attachment_url = "/api/donations/999/attachment"
    e = _expense(db_session, admin_id, 15.0)
    e.attachment_url = "/expenses/999/attachment"
    db_session.flush()

    r = client.get(f"{BASE}/report?start={PAST_START}&end={PAST_END}", headers=h)
    transactions = r.json()["transactions"]

    income_tx = next(t for t in transactions if t["type"] == "revenu")
    assert income_tx["attachment_url"] == "/api/donations/999/attachment"

    expense_tx = next(t for t in transactions if t["type"] == "dépense")
    assert expense_tx["attachment_url"] == "/expenses/999/attachment"


def test_report_empty_period_has_zero_totals(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/report?start=1999-01-01&end=1999-01-31", headers=h)
    body = r.json()
    assert body["income_cad"] == 0
    assert body["expenses_total"] == 0
    assert body["balance"] == 0
    assert body["transactions"] == []


# ── Préréglages de période ────────────────────────────────────────────────────


def test_report_period_day_resolves_to_today(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/report?period=day", headers=h)
    assert r.status_code == 200
    today = date.today().isoformat()
    body = r.json()
    assert body["period_start"] == today
    assert body["period_end"] == today


def test_report_no_bounds_means_all_time(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/report", headers=h)
    assert r.status_code == 200
    assert r.json()["period_start"] == "Toutes dates"


# ── Export ────────────────────────────────────────────────────────────────────


def test_export_invalid_format(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/report/export?format=doc", headers=h)
    assert r.status_code == 400


def test_export_csv(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/report/export?format=csv", headers=h)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert len(r.content) > 0


def test_export_csv_uses_readable_french_labels(client, make_user, auth_header):
    """Le résumé exporté doit afficher des libellés lisibles plutôt que les
    noms bruts des champs Pydantic (period_start, income_cad...)."""
    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/report/export?format=csv", headers=h)
    text = r.content.decode("utf-8")

    assert "Période du" in text
    assert "Revenus (CAD)" in text
    assert "Dépenses totales" in text
    assert "Solde" in text
    assert "Nombre de revenus" in text
    assert "Nombre de dépenses" in text
    assert "period_start" not in text
    assert "income_cad" not in text
    assert "expenses_total" not in text


def test_export_excel(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/report/export?format=excel", headers=h)
    assert r.status_code == 200
    assert "spreadsheetml" in r.headers["content-type"]


def test_export_pdf(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.get(f"{BASE}/report/export?format=pdf", headers=h)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"


# ── Rapport annuel des dons par donateur ──────────────────────────────────────

RDA = f"{BASE}/rapport-annuel-donateurs"


def test_annual_donor_report_requires_finance_permission(
    client, make_user, auth_header
):
    make_user("regular_rda@test.com")
    r = client.get(f"{RDA}?year=2020", headers=auth_header("regular_rda@test.com"))
    assert r.status_code == 403


def test_annual_donor_report_groups_member_donations_by_month(
    client, make_user, auth_header, db_session, make_member
):
    h = _admin_header(make_user, auth_header)
    church_id = db_session.scalar(select(Church.id).where(Church.parent_id.is_(None)))
    member = make_member("donateur.rda@test.com", church_id)
    _donation(
        db_session,
        100.0,
        member_id=member.id,
        created_at=datetime(2020, 1, 10, tzinfo=timezone.utc),
    )
    _donation(
        db_session,
        50.0,
        member_id=member.id,
        created_at=datetime(2020, 3, 5, tzinfo=timezone.utc),
    )

    r = client.get(f"{RDA}?year=2020", headers=h)
    assert r.status_code == 200
    entries = r.json()["entries"]
    entry = next(e for e in entries if e["donor_name"] == member.full_name)
    assert entry["monthly_totals"][0] == 100.0  # janvier
    assert entry["monthly_totals"][2] == 50.0  # mars
    assert entry["monthly_totals"][1] == 0.0  # février
    assert entry["annual_total"] == 150.0
    assert entry["donation_count"] == 2


def test_annual_donor_report_separates_currencies(
    client, make_user, auth_header, db_session
):
    h = _admin_header(make_user, auth_header)
    _donation(
        db_session,
        100.0,
        currency=DonationCurrency.CAD,
        donor_name="Devises Multiples",
        created_at=datetime(2020, 2, 1, tzinfo=timezone.utc),
    )
    _donation(
        db_session,
        40.0,
        currency=DonationCurrency.USD,
        donor_name="Devises Multiples",
        created_at=datetime(2020, 2, 1, tzinfo=timezone.utc),
    )

    r = client.get(f"{RDA}?year=2020", headers=h)
    rows = [e for e in r.json()["entries"] if e["donor_name"] == "Devises Multiples"]
    assert len(rows) == 2
    currencies = {row["currency"] for row in rows}
    assert currencies == {"CAD", "USD"}


def test_annual_donor_report_groups_saved_donor_by_id(
    client, make_user, auth_header, db_session
):
    h = _admin_header(make_user, auth_header)
    donor = Donor(name="Donateur Externe", email="externe@test.com")
    db_session.add(donor)
    db_session.flush()
    _donation(
        db_session,
        20.0,
        donor_id=donor.id,
        donor_name="Nom différent au moment du don",
        created_at=datetime(2020, 4, 1, tzinfo=timezone.utc),
    )
    _donation(
        db_session,
        30.0,
        donor_id=donor.id,
        donor_name="Nom différent au moment du don",
        created_at=datetime(2020, 4, 15, tzinfo=timezone.utc),
    )

    r = client.get(f"{RDA}?year=2020", headers=h)
    entries = [e for e in r.json()["entries"] if e["donor_email"] == "externe@test.com"]
    assert len(entries) == 1
    assert entries[0]["donor_name"] == "Donateur Externe"
    assert entries[0]["annual_total"] == 50.0
    assert entries[0]["donation_count"] == 2


def test_annual_donor_report_excludes_other_years(client, make_user, auth_header, db_session):
    h = _admin_header(make_user, auth_header)
    _donation(
        db_session,
        75.0,
        donor_name="Hors Période",
        created_at=datetime(2019, 12, 31, tzinfo=timezone.utc),
    )
    _donation(
        db_session,
        75.0,
        donor_name="Hors Période",
        created_at=datetime(2021, 1, 1, tzinfo=timezone.utc),
    )

    r = client.get(f"{RDA}?year=2020", headers=h)
    assert all(e["donor_name"] != "Hors Période" for e in r.json()["entries"])


def test_annual_donor_report_defaults_to_current_year(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.get(RDA, headers=h)
    assert r.status_code == 200
    assert r.json()["year"] == date.today().year


def test_annual_donor_report_export_csv_has_month_columns(
    client, make_user, auth_header, db_session
):
    h = _admin_header(make_user, auth_header)
    _donation(
        db_session,
        60.0,
        donor_name="Export CSV",
        created_at=datetime(2020, 6, 1, tzinfo=timezone.utc),
    )

    r = client.get(f"{RDA}/export?format=csv&year=2020", headers=h)
    assert r.status_code == 200
    text = r.content.decode("utf-8-sig")
    assert "Jan" in text
    assert "Juin" in text
    assert "Déc" in text
    assert "Export CSV" in text


def test_annual_donor_report_export_invalid_format(client, make_user, auth_header):
    h = _admin_header(make_user, auth_header)
    r = client.get(f"{RDA}/export?format=doc&year=2020", headers=h)
    assert r.status_code == 400
