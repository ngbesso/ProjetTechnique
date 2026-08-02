from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.models.setting import AppSetting
from app.schemas.setting import (
    PUBLIC_SETTINGS,
    SETTING_META,
    AppSettingRead,
    AppSettingUpdate,
)

router = APIRouter(prefix="/settings", tags=["paramètres système"])
# Permission dédiée plutôt que content:manage : les réglages mélangent du
# contenu éditorial (site_name, hero_*, social_*) et des leviers opérationnels
# (approbation automatique des adhésions, délai de rappel, gabarits de courriel)
# qu'un rédacteur CMS n'a pas à pouvoir modifier.
can_manage = Depends(require_global_permission("settings:manage"))


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


@router.get("", response_model=list[AppSettingRead], dependencies=[can_manage])
def list_settings(
    db: Annotated[Session, Depends(get_db)],
):
    rows = db.scalars(select(AppSetting)).all()
    return [_enrich(r) for r in rows]


@router.put("/{key}", response_model=AppSettingRead, dependencies=[can_manage])
def update_setting(
    key: str,
    data: AppSettingUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    if key not in SETTING_META:
        raise HTTPException(400, f"Paramètre inconnu : {key}")
    setting = db.get(AppSetting, key)
    if setting is None:
        setting = AppSetting(key=key, value=data.value)
        db.add(setting)
    else:
        setting.value = data.value
    db.commit()
    db.refresh(setting)
    return _enrich(setting)
