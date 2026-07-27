from datetime import date
from typing import Annotated

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_global_permission
from app.db.session import get_db
from app.models.church import Church
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import (
    ExpenseAdminStats,
    ExpenseCategoryAmount,
    ExpenseChurchAmount,
    ExpenseCreate,
    ExpenseList,
    ExpenseRead,
    ExpenseUpdate,
)
from app.services import storage

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
    expense = db.scalar(
        select(Expense)
        .options(selectinload(Expense.responsible))
        .where(Expense.id == expense_id)
    )
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
    query = select(Expense).options(selectinload(Expense.responsible))
    if q:
        query = query.where(Expense.comment.ilike(f"%{q}%"))
    if category:
        query = query.where(Expense.category == category)
    if start:
        query = query.where(Expense.expense_date >= start)
    if end:
        query = query.where(Expense.expense_date <= end)
    if church_id:
        query = query.where(Expense.church_id == church_id)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(
        query.order_by(Expense.expense_date.desc()).offset(offset).limit(limit)
    ).all()
    return ExpenseList(
        items=[_to_read(e) for e in items], total=total or 0, limit=limit, offset=offset
    )


@router.get("/admin/stats", response_model=ExpenseAdminStats, dependencies=[can_manage])
def get_expenses_stats(db: Annotated[Session, Depends(get_db)]):
    """Montant total, nombre de dépenses, répartition par catégorie et top 5 églises."""
    total_amount = float(
        db.scalar(select(func.coalesce(func.sum(Expense.amount), 0))) or 0
    )
    count = db.scalar(select(func.count()).select_from(Expense)) or 0

    cat_rows = db.execute(
        select(
            Expense.category, func.sum(Expense.amount), func.count(Expense.id)
        ).group_by(Expense.category)
    ).all()
    by_category = [
        ExpenseCategoryAmount(category=cat, total=float(total), count=cnt)
        for cat, total, cnt in cat_rows
    ]

    church_rows = db.execute(
        select(Expense.church_id, func.sum(Expense.amount))
        .where(Expense.church_id.isnot(None))
        .group_by(Expense.church_id)
        .order_by(func.sum(Expense.amount).desc())
        .limit(5)
    ).all()
    church_ids = [cid for cid, _ in church_rows]
    churches = (
        db.scalars(select(Church).where(Church.id.in_(church_ids))).all()
        if church_ids
        else []
    )
    name_map = {c.id: c.name for c in churches}
    top_churches = [
        ExpenseChurchAmount(
            church_id=cid, church_name=name_map.get(cid, "—"), total=float(total)
        )
        for cid, total in church_rows
    ]

    return ExpenseAdminStats(
        total_amount=total_amount,
        count=count,
        by_category=by_category,
        top_churches=top_churches,
    )


@router.get("/categories", response_model=list[str], dependencies=[can_manage])
def list_categories(db: Annotated[Session, Depends(get_db)]):
    rows = db.scalars(
        select(Expense.category).distinct().order_by(Expense.category)
    ).all()
    return list(rows)


@router.post("", response_model=ExpenseRead, status_code=201, dependencies=[can_manage])
def create_expense(
    data: ExpenseCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    expense = Expense(**data.model_dump(), responsible_id=current_user.id)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return _to_read(expense)


@router.patch("/{expense_id}", response_model=ExpenseRead, dependencies=[can_manage])
def update_expense(
    expense_id: int, data: ExpenseUpdate, db: Annotated[Session, Depends(get_db)]
):
    expense = _load(db, expense_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(expense, k, v)
    db.commit()
    db.refresh(expense)
    return _to_read(expense)


@router.delete("/{expense_id}", status_code=204, dependencies=[can_manage])
def delete_expense(expense_id: int, db: Annotated[Session, Depends(get_db)]):
    expense = _load(db, expense_id)
    db.delete(expense)
    db.commit()


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
    expense.attachment_url = f"/expenses/{expense_id}/attachment"
    expense.attachment_name = file.filename
    db.commit()
    db.refresh(expense)
    return _to_read(expense)


@router.delete("/{expense_id}/attachment", status_code=204, dependencies=[can_manage])
def delete_attachment(expense_id: int, db: Annotated[Session, Depends(get_db)]):
    expense = _load(db, expense_id)
    try:
        storage.delete_file(f"{_ATTACHMENT_PREFIX}/{expense_id}")
    except Exception:
        pass
    expense.attachment_url = None
    expense.attachment_name = None
    db.commit()
