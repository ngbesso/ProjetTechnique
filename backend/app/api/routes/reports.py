from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.api.routes.churches import get_churches_stats
from app.api.routes.donations import get_donations_stats
from app.api.routes.members import get_members_stats
from app.api.routes.posts import get_posts_stats
from app.api.routes.sermons import get_sermons_stats
from app.db.session import get_db
from app.models.user import User
from app.services import event_service, report_builder

router = APIRouter(prefix="/admin", tags=["rapports"])

DOMAIN_FETCHERS = {
    "membres": lambda db, user: get_members_stats(current_user=user, db=db),
    "dons": lambda db, user: get_donations_stats(db=db, _admin=user),
    "evenements": lambda db, user: event_service.get_admin_stats(db),
    "sermons": lambda db, user: get_sermons_stats(db=db),
    "articles": lambda db, user: get_posts_stats(db=db),
    "eglises": lambda db, user: get_churches_stats(db=db),
}

_FORMATS = {
    "excel": (
        report_builder.build_excel,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "xlsx",
    ),
    "word": (
        report_builder.build_word,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "docx",
    ),
    "pdf": (report_builder.build_pdf, "application/pdf", "pdf"),
}


@router.get("/reports/{domain}")
def get_report(
    domain: str,
    format: str,
    admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
    authorization: str | None = Header(default=None),
):
    """Génère un rapport téléchargeable (Excel/Word/PDF) sur un domaine donné,
    à partir des mêmes statistiques que les panneaux admin, avec une courte
    synthèse IA en meilleur effort."""
    if domain not in DOMAIN_FETCHERS:
        raise HTTPException(400, f"Domaine inconnu : {domain}")
    if format not in _FORMATS:
        raise HTTPException(400, f"Format inconnu : {format}")

    domain_label = report_builder.DOMAIN_LABELS[domain]
    stats = DOMAIN_FETCHERS[domain](db, admin)
    summary, tables = report_builder.flatten_stats(stats)

    ai_summary = (
        report_builder.fetch_ai_summary(domain_label, authorization)
        if authorization
        else None
    )

    build_fn, media_type, extension = _FORMATS[format]
    content = build_fn(f"Rapport — {domain_label}", summary, tables, ai_summary)

    filename = f"rapport-{domain}-{date.today().isoformat()}.{extension}"
    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
