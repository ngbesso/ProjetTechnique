from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.setting import AppSetting
from app.models.user import User
from app.schemas.setting import (
    BLOG_COMMENTS_MODES,
    PUBLIC_SETTINGS,
    SETTING_META,
    AppSettingRead,
    AppSettingUpdate,
)

router = APIRouter(prefix="/settings", tags=["paramètres système"])


def _require_admin(user: User) -> None:
    if not user.has_global_permission("*"):
        raise HTTPException(403, "Réservé aux administrateurs globaux")


def _enrich(s: AppSetting) -> AppSettingRead:
    return AppSettingRead(
        key=s.key,
        value=s.value,
        description=SETTING_META.get(s.key, ""),
    )


@router.get("/public", response_model=dict[str, str])
def get_public_settings(db: Annotated[Session, Depends(get_db)]):
    rows = db.scalars(
        select(AppSetting).where(AppSetting.key.in_(PUBLIC_SETTINGS))
    ).all()
    return {r.key: r.value for r in rows}


@router.get("", response_model=list[AppSettingRead])
def list_settings(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_admin(current_user)
    rows = db.scalars(select(AppSetting)).all()
    return [_enrich(r) for r in rows]


@router.put("/{key}", response_model=AppSettingRead)
def update_setting(
    key: str,
    data: AppSettingUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_admin(current_user)
    if key not in SETTING_META:
        raise HTTPException(400, f"Paramètre inconnu : {key}")
    if key == "blog_comments_mode" and data.value not in BLOG_COMMENTS_MODES:
        raise HTTPException(400, f"Valeur invalide pour {key}")
    setting = db.get(AppSetting, key)
    if setting is None:
        setting = AppSetting(key=key, value=data.value)
        db.add(setting)
    else:
        setting.value = data.value
    db.commit()
    db.refresh(setting)
    return _enrich(setting)
