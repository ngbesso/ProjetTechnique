from datetime import date
from typing import Annotated

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_global_permission
from app.db.session import get_db
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import (
    ExpenseAdminStats,
    ExpenseCreate,
    ExpenseList,
    ExpenseRead,
    ExpenseUpdate,
)
from app.services import expense_service, storage

router = APIRouter(prefix="/expenses", tags=["finances"])
can_manage = Depends(require_global_permission("finance:manage"))

_ATTACHMENT_PREFIX = "expenses/attachments"


def _to_read(expense: Expense) -> ExpenseRead:
    return ExpenseRead(
        id=expense.id,
        amount=float(expense.amount),
        expense_date=expense.expense_date,
        category=expense.category,
        church_id=expense.church_id,
        responsible_id=expense.responsible_id,
        responsible_email=expense.responsible.email,
        comment=expense.comment,
        attachment_url=expense.attachment_url,
        attachment_name=expense.attachment_name,
        created_at=expense.created_at,
    )


def _load(db: Session, expense_id: int) -> Expense:
    expense = expense_service.get_expense(db, expense_id)
    if not expense:
        raise HTTPException(404, "Dépense introuvable")
    return expense


@router.get("", response_model=ExpenseList, dependencies=[can_manage])
def list_expenses(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    category: str | None = None,
    start: date | None = None,
    end: date | None = None,
    church_id: int | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    items, total = expense_service.list_expenses(
        db,
        q=q,
        category=category,
        start=start,
        end=end,
        church_id=church_id,
        limit=limit,
        offset=offset,
    )
    return ExpenseList(
        items=[_to_read(e) for e in items], total=total, limit=limit, offset=offset
    )


@router.get("/admin/stats", response_model=ExpenseAdminStats, dependencies=[can_manage])
def get_expenses_stats(db: Annotated[Session, Depends(get_db)]):
    """Montant total, nombre de dépenses, répartition par catégorie et top 5 églises."""
    return expense_service.get_admin_stats(db)


@router.get("/categories", response_model=list[str], dependencies=[can_manage])
def list_categories(db: Annotated[Session, Depends(get_db)]):
    return expense_service.list_categories(db)


@router.post("", response_model=ExpenseRead, status_code=201, dependencies=[can_manage])
def create_expense(
    data: ExpenseCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    expense = expense_service.create_expense(db, data, responsible_id=current_user.id)
    return _to_read(expense)


@router.patch("/{expense_id}", response_model=ExpenseRead, dependencies=[can_manage])
def update_expense(
    expense_id: int, data: ExpenseUpdate, db: Annotated[Session, Depends(get_db)]
):
    return _to_read(expense_service.update_expense(db, _load(db, expense_id), data))


@router.delete("/{expense_id}", status_code=204, dependencies=[can_manage])
def delete_expense(expense_id: int, db: Annotated[Session, Depends(get_db)]):
    expense_service.delete_expense(db, _load(db, expense_id))


# ── Pièce jointe justificative (facultative) ──────────────────────────────────


@router.get("/{expense_id}/attachment", dependencies=[can_manage])
def get_attachment(expense_id: int, db: Annotated[Session, Depends(get_db)]):
    expense = _load(db, expense_id)
    if not expense.attachment_url:
        raise HTTPException(404, "Pas de pièce jointe")
    try:
        obj = storage.get_object(f"{_ATTACHMENT_PREFIX}/{expense_id}")
    except ClientError:
        raise HTTPException(404, "Fichier introuvable")
    content_type = obj.get("ContentType", "application/octet-stream")
    filename = expense.attachment_name or f"piece-jointe-{expense_id}"
    return StreamingResponse(
        obj["Body"].iter_chunks(1024 * 256),
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post(
    "/{expense_id}/attachment", response_model=ExpenseRead, dependencies=[can_manage]
)
def upload_attachment(
    expense_id: int,
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile = File(...),
):
    expense = _load(db, expense_id)
    content_type = file.content_type or "application/octet-stream"
    storage.upload_file(file.file, f"{_ATTACHMENT_PREFIX}/{expense_id}", content_type)
    updated = expense_service.set_attachment(
        db, expense, url=f"/expenses/{expense_id}/attachment", name=file.filename
    )
    return _to_read(updated)


@router.delete("/{expense_id}/attachment", status_code=204, dependencies=[can_manage])
def delete_attachment(expense_id: int, db: Annotated[Session, Depends(get_db)]):
    expense = _load(db, expense_id)
    storage.delete_file_quiet(f"{_ATTACHMENT_PREFIX}/{expense_id}")
    expense_service.set_attachment(db, expense, url=None, name=None)
