from pydantic import BaseModel, ConfigDict

# Clés autorisées avec leur description
SETTING_META: dict[str, str] = {
    "auto_approve_members": "Approuver automatiquement les demandes d'adhésion",
    "zeffy_embed_path": "Chemin du formulaire Zeffy (ex: /fr/donation-form/xxx)",
}

# Clés retournées sans authentification
PUBLIC_SETTINGS: set[str] = {"zeffy_embed_path", "auto_approve_members"}


class AppSettingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    key: str
    value: str
    description: str = ""


class AppSettingUpdate(BaseModel):
    value: str
