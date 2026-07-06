from pydantic import BaseModel, ConfigDict

VALID_CATEGORIES = {"sexe", "family_status", "district", "donation_category"}


class ParameterValueRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category: str
    label: str
    position: int


class ParameterValueCreate(BaseModel):
    label: str
    position: int = 0


class ParameterValueUpdate(BaseModel):
    label: str | None = None
    position: int | None = None
