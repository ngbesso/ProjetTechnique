from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.church import Church
from app.models.expense import Expense
from app.schemas.expense import (
    ExpenseAdminStats,
    ExpenseCategoryAmount,
    ExpenseChurchAmount,
    ExpenseCreate,
    ExpenseUpdate,
)


def get_expense(db: Session, expense_id: int) -> Expense | None:
    """Charge la dépense avec son responsable — ExpenseRead expose son courriel."""
    return db.scalar(
        select(Expense)
        .options(selectinload(Expense.responsible))
        .where(Expense.id == expense_id)
    )


def list_expenses(
    db: Session,
    *,
    q: str | None = None,
    category: str | None = None,
    start: date | None = None,
    end: date | None = None,
    church_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Expense], int]:
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
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(
        query.order_by(Expense.expense_date.desc()).offset(offset).limit(limit)
    ).all()
    return list(items), total


def list_categories(db: Session) -> list[str]:
    return list(
        db.scalars(select(Expense.category).distinct().order_by(Expense.category)).all()
    )


def create_expense(db: Session, payload: ExpenseCreate, *, responsible_id: int) -> Expense:
    expense = Expense(**payload.model_dump(), responsible_id=responsible_id)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def update_expense(db: Session, expense: Expense, payload: ExpenseUpdate) -> Expense:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(expense, key, value)
    db.commit()
    db.refresh(expense)
    return expense


def set_attachment(
    db: Session, expense: Expense, *, url: str | None, name: str | None
) -> Expense:
    expense.attachment_url = url
    expense.attachment_name = name
    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(db: Session, expense: Expense) -> None:
    db.delete(expense)
    db.commit()


def get_admin_stats(db: Session) -> ExpenseAdminStats:
    """Montant total, nombre de dépenses, répartition par catégorie et top 5 églises."""
    total_amount = float(db.scalar(select(func.coalesce(func.sum(Expense.amount), 0))) or 0)
    count = db.scalar(select(func.count()).select_from(Expense)) or 0

    cat_rows = db.execute(
        select(Expense.category, func.sum(Expense.amount), func.count(Expense.id)).group_by(
            Expense.category
        )
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
        ExpenseChurchAmount(church_id=cid, church_name=name_map.get(cid, "—"), total=float(total))
        for cid, total in church_rows
    ]

    return ExpenseAdminStats(
        total_amount=total_amount,
        count=count,
        by_category=by_category,
        top_churches=top_churches,
    )
