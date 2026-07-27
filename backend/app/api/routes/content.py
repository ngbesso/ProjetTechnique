from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.models.menu_item import MenuItem
from app.schemas.menu_item import (
    ALLOWED_TARGET_PAGES,
    MenuItemCreate,
    MenuItemRead,
    MenuItemUpdate,
)

router = APIRouter(prefix="/content", tags=["contenu"])
can_manage = Depends(require_global_permission("content:manage"))


def _validate_target_page(target_page: str | None) -> None:
    if target_page is not None and target_page not in ALLOWED_TARGET_PAGES:
        raise HTTPException(400, f"Page cible invalide : {target_page}")


def _load(db: Session, item_id: int) -> MenuItem:
    item = db.get(MenuItem, item_id)
    if item is None:
        raise HTTPException(404, "Entrée de menu introuvable")
    return item


@router.get("/menu", response_model=list[MenuItemRead])
def get_menu(db: Annotated[Session, Depends(get_db)]):
    """Menu principal public — entrées visibles, triées par position."""
    items = db.scalars(
        select(MenuItem)
        .where(MenuItem.is_visible.is_(True))
        .order_by(MenuItem.position)
    ).all()
    return list(items)


@router.get("/menu/admin", response_model=list[MenuItemRead], dependencies=[can_manage])
def get_menu_admin(db: Annotated[Session, Depends(get_db)]):
    """Toutes les entrées de menu (masquées comprises) — réservé aux administrateurs."""
    items = db.scalars(select(MenuItem).order_by(MenuItem.position)).all()
    return list(items)


@router.post(
    "/menu", response_model=MenuItemRead, status_code=201, dependencies=[can_manage]
)
def create_menu_item(payload: MenuItemCreate, db: Annotated[Session, Depends(get_db)]):
    _validate_target_page(payload.target_page)
    item = MenuItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/menu/{item_id}", response_model=MenuItemRead, dependencies=[can_manage])
def update_menu_item(
    item_id: int, payload: MenuItemUpdate, db: Annotated[Session, Depends(get_db)]
):
    _validate_target_page(payload.target_page)
    item = _load(db, item_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/menu/{item_id}", status_code=204, dependencies=[can_manage])
def delete_menu_item(item_id: int, db: Annotated[Session, Depends(get_db)]):
    item = _load(db, item_id)
    db.delete(item)
    db.commit()
