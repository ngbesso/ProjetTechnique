from datetime import datetime

from pydantic import BaseModel, Field

# Pages publiques valides comme cible d'une entrée de menu — sous-ensemble du
# type `Page` du frontend (frontend/src/types/index.ts), exclut les pages
# internes/admin (mon-profil, espace, admin, organiser-evenements, etc.).
ALLOWED_TARGET_PAGES: dict[str, str] = {
    "home": "Accueil",
    "leadership": "Leadership",
    "sermons": "Sermons",
    "blog": "Blog",
    "actualites": "Actualités",
    "evenements": "Événements",
    "donation": "Faire un don",
    "adhesion": "Devenir membre",
    "login": "Se connecter",
}


class MenuItemCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=100)
    target_page: str
    position: int = 0
    is_visible: bool = True


class MenuItemUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=100)
    target_page: str | None = None
    position: int | None = None
    is_visible: bool | None = None


class MenuItemRead(BaseModel):
    id: int
    label: str
    target_page: str
    position: int
    is_visible: bool
    created_at: datetime

    model_config = {"from_attributes": True}
