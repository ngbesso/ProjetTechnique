import re
import unicodedata
from datetime import date, datetime, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.schemas.finance import DonorAnnualReport, FinanceReport
from app.services import finance_service, report_builder

router = APIRouter(prefix="/finances", tags=["finances"])
can_manage = Depends(require_global_permission("finance:manage"))


def _slugify(value: str) -> str:
    """Convertit un texte libre (ex. nom de donateur) en fragment de nom de
    fichier sûr : minuscules, sans accents, espaces remplacés par des tirets."""
    normalized = unicodedata.normalize("NFKD", value)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_only).strip("-").lower()
    return slug or "donateur"

Period = Literal["day", "week", "month", "year", "custom"]

_FORMATS = {
    "pdf": (report_builder.build_pdf, "application/pdf", "pdf"),
    "excel": (
        report_builder.build_excel,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "xlsx",
    ),
    "csv": (report_builder.build_csv, "text/csv", "csv"),
}

# Libellés lisibles pour le résumé exporté (PDF/Excel/CSV) — sans ce mapping,
# flatten_stats affiche les noms bruts des champs Pydantic (period_start,
# income_cad...) directement dans le fichier téléchargé par l'admin.
FINANCE_FIELD_LABELS = {
    "period_start": "Période du",
    "period_end": "Période au",
    "income_cad": "Revenus (CAD)",
    "income_usd": "Revenus (USD)",
    "expenses_total": "Dépenses totales",
    "balance": "Solde",
    "income_count": "Nombre de revenus",
    "expense_count": "Nombre de dépenses",
}


@router.get("/report", response_model=FinanceReport, dependencies=[can_manage])
def get_finance_report(
    db: Annotated[Session, Depends(get_db)],
    period: Period | None = None,
    start: date | None = None,
    end: date | None = None,
):
    """Revenus, dépenses, solde et détail des transactions sur une période
    (préréglage jour/semaine/mois/année, ou bornes `start`/`end` personnalisées ;
    tout omis = historique complet)."""
    resolved_start, resolved_end = finance_service.resolve_period(period, start, end)
    return finance_service.build_report(db, resolved_start, resolved_end)


@router.get("/report/export", dependencies=[can_manage])
def export_finance_report(
    db: Annotated[Session, Depends(get_db)],
    format: str,
    period: Period | None = None,
    start: date | None = None,
    end: date | None = None,
):
    """Télécharge le rapport financier de la période (PDF, Excel ou CSV)."""
    if format not in _FORMATS:
        raise HTTPException(400, f"Format inconnu : {format}")

    resolved_start, resolved_end = finance_service.resolve_period(period, start, end)
    report = finance_service.build_report(db, resolved_start, resolved_end)
    summary, tables = report_builder.flatten_stats(report, FINANCE_FIELD_LABELS)

    build_fn, media_type, extension = _FORMATS[format]
    content = build_fn("Rapport financier", summary, tables)

    today = datetime.now(timezone.utc).date()
    filename = f"rapport-financier-{today.isoformat()}.{extension}"
    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get(
    "/rapport-annuel-donateurs",
    response_model=DonorAnnualReport,
    dependencies=[can_manage],
)
def get_annual_donor_report(
    db: Annotated[Session, Depends(get_db)],
    year: int | None = None,
    member_id: int | None = None,
):
    """Rapport annuel des dons par personne, réparti par mois — toutes les
    églises confondues (année en cours si `year` est omis). `member_id`
    restreint le résultat au rapport individuel d'un seul membre."""
    target_year = year or datetime.now(timezone.utc).year
    report = finance_service.build_annual_donor_report(db, target_year)
    if member_id is not None:
        entries = [e for e in report.entries if e.member_id == member_id]
        if not entries:
            raise HTTPException(404, "Aucun don pour ce membre sur cette année")
        report = report.model_copy(update={"entries": entries})
    return report


@router.get("/rapport-annuel-donateurs/export", dependencies=[can_manage])
def export_annual_donor_report(
    db: Annotated[Session, Depends(get_db)],
    format: str,
    year: int | None = None,
    member_id: int | None = None,
):
    """Télécharge le rapport annuel des dons par personne (PDF, Excel ou CSV).
    `member_id` produit un document individuel pour un seul membre plutôt que
    le tableau complet de tous les donateurs."""
    if format not in _FORMATS:
        raise HTTPException(400, f"Format inconnu : {format}")

    target_year = year or datetime.now(timezone.utc).year
    report = finance_service.build_annual_donor_report(db, target_year)

    entries = report.entries
    title = f"Rapport annuel des dons par donateur — {target_year}"
    filename_slug = str(target_year)
    if member_id is not None:
        entries = [e for e in entries if e.member_id == member_id]
        if not entries:
            raise HTTPException(404, "Aucun don pour ce membre sur cette année")
        title = f"Rapport annuel de dons — {entries[0].donor_name} — {target_year}"
        filename_slug = f"{_slugify(entries[0].donor_name)}-{target_year}"

    rows = [
        {
            "Donateur": e.donor_name,
            "Courriel": e.donor_email or "",
            "Devise": e.currency,
            **dict(zip(finance_service.MONTH_LABELS_FR, e.monthly_totals)),
            "Total annuel": e.annual_total,
            "Nombre de dons": e.donation_count,
        }
        for e in entries
    ]
    summary = [
        ("Année", str(target_year)),
        ("Généré le", report.generated_at.strftime("%d/%m/%Y %H:%M")),
        ("Nombre de donateurs", str(len(entries))),
    ]
    tables = {"Dons par donateur": rows}

    build_fn, media_type, extension = _FORMATS[format]
    content = build_fn(title, summary, tables)

    filename = f"rapport-annuel-donateurs-{filename_slug}.{extension}"
    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
