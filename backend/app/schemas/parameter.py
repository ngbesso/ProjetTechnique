from pydantic import BaseModel, ConfigDict

VALID_CATEGORIES = {
    "sexe",
    "family_status",
    "district",
    "donation_category",
    "event_category",
    "intervenant_category",
    "ministry",
    "expense_category",
    "leader_role",
    "member_request_type",
}


class ParameterValueRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category: str
    label: str
    position: int
    restricted_to_sexe: str | None = None


class ParameterValueCreate(BaseModel):
    label: str
    position: int = 0
    restricted_to_sexe: str | None = None


class ParameterValueUpdate(BaseModel):
    label: str | None = None
    position: int | None = None
    restricted_to_sexe: str | None = None
