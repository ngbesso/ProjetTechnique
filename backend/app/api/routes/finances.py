from datetime import date, datetime, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.schemas.finance import FinanceReport
from app.services import finance_service, report_builder

router = APIRouter(prefix="/finances", tags=["finances"])
can_manage = Depends(require_global_permission("finance:manage"))

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
    summary, tables = report_builder.flatten_stats(report)

    build_fn, media_type, extension = _FORMATS[format]
    content = build_fn("Rapport financier", summary, tables)

    today = datetime.now(timezone.utc).date()
    filename = f"rapport-financier-{today.isoformat()}.{extension}"
    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
