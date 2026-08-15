from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.core.email import EmailSender, get_email_sender
from app.db.session import get_db
from app.models.setting import AppSetting
from app.schemas.setting import (
    PUBLIC_SETTINGS,
    SETTING_META,
    AppSettingRead,
    AppSettingUpdate,
)
from app.services import member_service

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
    background: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    sender: Annotated[EmailSender, Depends(get_email_sender)],
):
    if key not in SETTING_META:
        raise HTTPException(400, f"Paramètre inconnu : {key}")
    setting = db.get(AppSetting, key)
    if setting is None:
        setting = AppSetting(key=key, value=data.value)
        db.add(setting)
    else:
        setting.value = data.value

    # Activer l'approbation automatique traite aussi le stock de demandes déjà
    # en attente, pas seulement les futures — sinon l'admin devrait encore les
    # approuver une à une. Les demandes refusées ont un statut distinct
    # (rejected) : approve_all_pending ne sélectionne que les pending, donc
    # elles ne sont jamais concernées.
    if key == "auto_approve_members" and data.value == "true":
        member_service.approve_all_pending(db, background, sender)

    db.commit()
    db.refresh(setting)
    return _enrich(setting)
