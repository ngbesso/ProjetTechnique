import csv
import io
from datetime import date, datetime
from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.responses import StreamingResponse
from openpyxl import Workbook, load_workbook
from openpyxl.utils import get_column_letter
from pydantic import ValidationError
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_global_permission
from app.core.email import EmailSender, get_email_sender, membership_received
from app.db.pagination import paginate
from app.db.session import get_db
from app.models.church import Church
from app.models.member import Member, MemberStatus
from app.models.user import User
from app.schemas.common import Page
from app.schemas.member import (
    BirthdayGreetingsSendResult,
    BirthdaysOverview,
    MemberBirthday,
    MemberCreate,
    MemberImportResult,
    MemberImportRowError,
    MemberRead,
    MemberSelfUpdate,
    MembershipRequest,
    MemberStatusStats,
    MemberUpdate,
)
from app.services import member_service
from app.services.birthday_service import (
    birthdays_this_month,
    birthdays_today,
    send_monthly_birthday_greetings,
)

_IMPORT_REQUIRED_COLUMNS = {"first_name", "last_name", "email"}
_IMPORT_COLUMNS = (
    "first_name",
    "last_name",
    "email",
    "address",
    "birth_date",
    "sexe",
    "telephone",
    "family_status",
    "conversion_date",
    "is_baptized",
)
_IMPORT_EXAMPLE_ROW = (
    "Jean",
    "Dupont",
    "jean.dupont@exemple.com",
    "123 Rue Principale",
    "1985-06-14",
    "Masculin",
    "5145551234",
    "Marie(e)",
    "2010-09-01",
    "oui",
)


def _parse_bool(value: str | None) -> bool:
    return (value or "").strip().lower() in ("1", "true", "vrai", "oui", "yes", "y")


def _cell_to_str(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "oui" if value else "non"
    if isinstance(value, (datetime, date)):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _rows_from_csv(content: bytes) -> tuple[list[str], list[dict[str, str]]]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return list(reader.fieldnames or []), [dict(row) for row in reader]


def _rows_from_xlsx(content: bytes) -> tuple[list[str], list[dict[str, str]]]:
    wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)
    header_row = next(rows_iter, ())
    fieldnames = [str(h).strip() if h is not None else "" for h in header_row]
    rows: list[dict[str, str]] = []
    for values in rows_iter:
        if all(v is None for v in values):
            continue
        rows.append(
            {
                fieldnames[i]: _cell_to_str(values[i])
                for i in range(len(fieldnames))
                if i < len(values)
            }
        )
    return fieldnames, rows


def _build_import_template() -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Membres"
    ws.append(_IMPORT_COLUMNS)
    ws.append(_IMPORT_EXAMPLE_ROW)
    for i, header in enumerate(_IMPORT_COLUMNS, start=1):
        ws.column_dimensions[get_column_letter(i)].width = max(len(header) + 2, 14)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


router = APIRouter(prefix="/members", tags=["membres"])


def _load(db: Session, member_id: int) -> Member:
    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(404, "Membre introuvable")
    return member


def _ensure(user: User, member: Member, code: str) -> None:
    if not user.has_permission(code, member.church_id):
        raise HTTPException(403, "Permission insuffisante sur cette église")


@router.post("/request", response_model=MemberRead, status_code=201)
def request_membership(
    data: MembershipRequest,
    background: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    sender: Annotated[EmailSender, Depends(get_email_sender)],
):
    if not db.get(Church, data.church_id):
        raise HTTPException(404, "Église introuvable")
    member_service.check_email_unique(db, data.email)

    member = Member(**data.model_dump(), status=MemberStatus.pending)
    db.add(member)
    db.flush()

    if member_service.auto_approve_enabled(db):
        member_service.approve(member, db, background, sender)
    else:
        background.add_task(
            membership_received, sender, member.email, member.first_name
        )

    db.commit()
    db.refresh(member)
    return member


@router.get("/me", response_model=MemberRead)
def my_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = db.scalar(select(Member).where(Member.user_id == current_user.id))
    if not member:
        raise HTTPException(404, "Aucun profil de membre associé")
    return member


@router.patch("/me", response_model=MemberRead)
def update_my_profile(
    data: MemberSelfUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = db.scalar(select(Member).where(Member.user_id == current_user.id))
    if not member:
        raise HTTPException(404, "Aucune fiche membre liée à ce compte")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(member, k, v)
    db.commit()
    db.refresh(member)
    return member


@router.get("", response_model=Page[MemberRead])
def list_members(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    status: MemberStatus | None = None,
    family_status: str | None = None,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
):
    scope = current_user.accessible_church_ids("member:read")
    if scope is not None and not scope:
        raise HTTPException(403, "Aucun périmètre accessible")
    query = select(Member)
    if scope is not None:
        query = query.where(Member.church_id.in_(scope))
    if q:
        like = f"%{q}%"
        query = query.where(
            or_(
                Member.first_name.ilike(like),
                Member.last_name.ilike(like),
                Member.email.ilike(like),
            )
        )
    if status:
        query = query.where(Member.status == status)
    if family_status:
        query = query.where(Member.family_status == family_status)
    rows, total = paginate(db, query.order_by(Member.created_at.desc()), limit, offset)
    return Page[MemberRead](
        items=[MemberRead.model_validate(m) for m in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/admin/stats", response_model=MemberStatusStats)
def get_members_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Comptages de membres par statut, dans le périmètre de l'utilisateur."""
    scope = current_user.accessible_church_ids("member:read")
    if scope is not None and not scope:
        raise HTTPException(403, "Aucun périmètre accessible")
    query = select(Member.status, func.count(Member.id))
    if scope is not None:
        query = query.where(Member.church_id.in_(scope))
    rows = db.execute(query.group_by(Member.status)).all()
    counts = {s: 0 for s in MemberStatus}
    for status_value, cnt in rows:
        counts[status_value] = cnt
    return MemberStatusStats(
        active=counts[MemberStatus.active],
        pending=counts[MemberStatus.pending],
        inactive=counts[MemberStatus.inactive],
        rejected=counts[MemberStatus.rejected],
    )


@router.get("/admin/stats/family-status", response_model=dict[str, int])
def get_members_family_status_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Répartition des membres par statut matrimonial, dans le périmètre de l'utilisateur."""
    scope = current_user.accessible_church_ids("member:read")
    if scope is not None and not scope:
        raise HTTPException(403, "Aucun périmètre accessible")
    query = select(Member.family_status, func.count(Member.id)).where(
        Member.family_status.is_not(None)
    )
    if scope is not None:
        query = query.where(Member.church_id.in_(scope))
    rows = db.execute(query.group_by(Member.family_status)).all()
    return {family_status: count for family_status, count in rows}


@router.get("/admin/birthdays", response_model=BirthdaysOverview)
def get_birthdays_overview(
    current_user: Annotated[User, Depends(require_global_permission("member:update"))],
    db: Annotated[Session, Depends(get_db)],
):
    """Anniversaires du jour et du mois en cours, pour la section « Anniversaires »
    de l'administration."""
    return BirthdaysOverview(
        today=[MemberBirthday.model_validate(m) for m in birthdays_today(db)],
        this_month=[MemberBirthday.model_validate(m) for m in birthdays_this_month(db)],
    )


@router.post("/admin/birthday-greetings/send", response_model=BirthdayGreetingsSendResult)
def send_birthday_greetings(
    current_user: Annotated[User, Depends(require_global_permission("member:update"))],
    db: Annotated[Session, Depends(get_db)],
    sender: Annotated[EmailSender, Depends(get_email_sender)],
    month: Annotated[int, Query(ge=1, le=12)],
):
    """Envoie manuellement le message groupé mensuel aux membres actifs nés le
    mois donné. Coexiste avec le job automatique du 1er de chaque mois — les
    deux modes peuvent envoyer pour le même mois sans se bloquer."""
    sent = send_monthly_birthday_greetings(db, sender, month)
    return BirthdayGreetingsSendResult(sent=sent)


@router.post("", response_model=MemberRead, status_code=201)
def create_member(
    data: MemberCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if not current_user.has_permission("member:create", data.church_id):
        raise HTTPException(403, "Permission insuffisante sur cette église")
    if not db.get(Church, data.church_id):
        raise HTTPException(404, "Église introuvable")
    member_service.check_email_unique(db, data.email)
    member = Member(**data.model_dump(), status=MemberStatus.active)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.get("/import/template")
def download_import_template(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Modèle Excel (colonnes attendues + exemple) pour l'import en masse de membres."""
    scope = current_user.accessible_church_ids("member:create")
    if scope is not None and not scope:
        raise HTTPException(403, "Permission insuffisante")
    content = _build_import_template()
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=modele-import-membres.xlsx"
        },
    )


@router.post("/import", response_model=MemberImportResult)
def import_members(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    church_id: Annotated[int, Form()],
    file: Annotated[UploadFile, File()],
):
    """Importe en masse des membres déjà connus d'une église (statut actif direct). Accepte .csv et .xlsx."""
    if not current_user.has_permission("member:create", church_id):
        raise HTTPException(403, "Permission insuffisante sur cette église")
    if not db.get(Church, church_id):
        raise HTTPException(404, "Église introuvable")

    content = file.file.read()
    if (file.filename or "").lower().endswith(".xlsx"):
        fieldnames, rows = _rows_from_xlsx(content)
    else:
        fieldnames, rows = _rows_from_csv(content)

    missing_columns = _IMPORT_REQUIRED_COLUMNS - set(fieldnames)
    if missing_columns:
        raise HTTPException(
            422,
            f"Colonnes manquantes dans le fichier : {', '.join(sorted(missing_columns))}",
        )

    errors: list[MemberImportRowError] = []
    seen_emails: set[str] = set()
    created = 0

    for i, row in enumerate(rows, start=2):  # ligne 1 = en-têtes
        email = (row.get("email") or "").strip().lower()
        try:
            data = MemberCreate.model_validate(
                {
                    "church_id": church_id,
                    "first_name": (row.get("first_name") or "").strip(),
                    "last_name": (row.get("last_name") or "").strip(),
                    "email": email,
                    "address": (row.get("address") or "").strip() or None,
                    "birth_date": (row.get("birth_date") or "").strip() or None,
                    "sexe": (row.get("sexe") or "").strip() or None,
                    "telephone": (row.get("telephone") or "").strip() or None,
                    "family_status": (row.get("family_status") or "").strip() or None,
                    "conversion_date": (row.get("conversion_date") or "").strip()
                    or None,
                    "is_baptized": _parse_bool(row.get("is_baptized")),
                }
            )
        except ValidationError as exc:
            errors.append(
                MemberImportRowError(
                    row=i, email=email or None, message=exc.errors()[0]["msg"]
                )
            )
            continue

        if email in seen_emails:
            errors.append(
                MemberImportRowError(
                    row=i, email=email, message="Email en double dans le fichier."
                )
            )
            continue
        try:
            member_service.check_email_unique(db, data.email)
        except HTTPException:
            errors.append(
                MemberImportRowError(
                    row=i,
                    email=email,
                    message="Cette adresse courriel est déjà utilisée.",
                )
            )
            continue

        member = Member(
            **data.model_dump(),
            status=MemberStatus.active,
            member_code=member_service.generate_member_code(db),
        )
        db.add(member)
        db.flush()
        seen_emails.add(email)
        created += 1

    db.commit()
    return MemberImportResult(created=created, errors=errors)


@router.get("/{member_id}", response_model=MemberRead)
def get_member(
    member_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = _load(db, member_id)
    _ensure(current_user, member, "member:read")
    return member


@router.patch("/{member_id}", response_model=MemberRead)
def update_member(
    member_id: int,
    data: MemberUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = _load(db, member_id)
    _ensure(current_user, member, "member:update")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(member, k, v)
    db.commit()
    db.refresh(member)
    return member


@router.post("/{member_id}/approve", response_model=MemberRead)
def approve_member(
    member_id: int,
    background: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    sender: Annotated[EmailSender, Depends(get_email_sender)],
):
    member = _load(db, member_id)
    _ensure(current_user, member, "member:approve")
    member_service.approve(member, db, background, sender)
    db.commit()
    db.refresh(member)
    return member


@router.post("/{member_id}/reject", response_model=MemberRead)
def reject_member(
    member_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = _load(db, member_id)
    _ensure(current_user, member, "member:approve")
    member.status = MemberStatus.rejected
    db.commit()
    db.refresh(member)
    return member


@router.post("/{member_id}/deactivate", response_model=MemberRead)
def deactivate_member(
    member_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = _load(db, member_id)
    _ensure(current_user, member, "member:update")
    member.status = MemberStatus.inactive
    db.commit()
    db.refresh(member)
    return member


@router.post("/{member_id}/activate", response_model=MemberRead)
def activate_member(
    member_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = _load(db, member_id)
    _ensure(current_user, member, "member:update")
    member.status = MemberStatus.active
    db.commit()
    db.refresh(member)
    return member
