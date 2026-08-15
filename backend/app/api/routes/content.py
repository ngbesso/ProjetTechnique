from typing import Annotated

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.models.menu_item import MenuItem
from app.models.setting import AppSetting
from app.schemas.menu_item import (
    ALLOWED_TARGET_PAGES,
    MenuItemCreate,
    MenuItemRead,
    MenuItemUpdate,
)
from app.services import storage

router = APIRouter(prefix="/content", tags=["contenu"])
can_manage = Depends(require_global_permission("content:manage"))

_LOGO_KEY = "site/logo"
_LOGO_SETTING_KEY = "site_logo_url"


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


# ── Logo du site ───────────────────────────────────────────────────────────────


@router.get("/logo")
def get_logo(db: Annotated[Session, Depends(get_db)]):
    """Sert le logo du site depuis MinIO — accessible sans authentification."""
    setting = db.get(AppSetting, _LOGO_SETTING_KEY)
    if not setting or not setting.value:
        raise HTTPException(404, "Aucun logo configuré")
    try:
        obj = storage.get_object(_LOGO_KEY)
    except ClientError:
        raise HTTPException(404, "Logo introuvable")
    content_type = obj.get("ContentType", "image/png")
    return StreamingResponse(
        obj["Body"].iter_chunks(1024 * 256),
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.post("/logo", response_model=dict[str, str], dependencies=[can_manage])
def upload_logo(
    file: Annotated[UploadFile, File()], db: Annotated[Session, Depends(get_db)]
):
    """Téléverse (ou remplace) le logo du site dans MinIO."""
    content_type = file.content_type or "image/png"
    storage.upload_file(file.file, _LOGO_KEY, content_type)
    setting = db.get(AppSetting, _LOGO_SETTING_KEY)
    if setting is None:
        setting = AppSetting(key=_LOGO_SETTING_KEY, value="/content/logo")
        db.add(setting)
    else:
        setting.value = "/content/logo"
    db.commit()
    return {"site_logo_url": setting.value}


@router.delete("/logo", status_code=204, dependencies=[can_manage])
def delete_logo(db: Annotated[Session, Depends(get_db)]):
    storage.delete_file_quiet(_LOGO_KEY)
    setting = db.get(AppSetting, _LOGO_SETTING_KEY)
    if setting is not None:
        setting.value = ""
        db.commit()
