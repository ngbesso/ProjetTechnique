from pydantic import BaseModel


class PublicStats(BaseModel):
    """Comptages exposés sans authentification, pour la bande de statistiques
    de la page d'accueil."""

    active_churches: int
    affiliated_churches: int
    active_members: int
