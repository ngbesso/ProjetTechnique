import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.sermon import FormatSermon, StatutSermon


class SermonBase(BaseModel):
    titre: str = Field(..., max_length=255)
    predicateur: str = Field(..., max_length=255)
    date_sermon: date | None = None
    description: str | None = None
    serie: str | None = None
    tags: list[str] = Field(default_factory=list)
    format: FormatSermon = FormatSermon.AUDIO
    duree_secondes: int | None = None


class SermonCreate(SermonBase):
    fichier_key: str | None = None
    statut: StatutSermon = StatutSermon.BROUILLON


class SermonUpdate(BaseModel):
    titre: str | None = Field(None, max_length=255)
    predicateur: str | None = Field(None, max_length=255)
    date_sermon: date | None = None
    description: str | None = None
    serie: str | None = None
    tags: list[str] | None = None
    format: FormatSermon | None = None
    duree_secondes: int | None = None
    statut: StatutSermon | None = None


class SermonOut(SermonBase):
    id: uuid.UUID
    fichier_key: str | None
    statut: StatutSermon
    vues: int
    uploaded_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SermonListOut(BaseModel):
    items: list[SermonOut]
    total: int
    skip: int
    limit: int


class UploadUrlResponse(BaseModel):
    upload_url: str
    fichier_key: str
