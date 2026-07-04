from pydantic import BaseModel, ConfigDict

# Clés autorisées avec leur description
SETTING_META: dict[str, str] = {
    "auto_approve_members": "Approuver automatiquement les demandes d'adhésion",
}


class AppSettingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    key: str
    value: str
    description: str = ""


class AppSettingUpdate(BaseModel):
    value: str
