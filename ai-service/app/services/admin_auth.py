import httpx

from app.core.config import settings


class AdminAuthError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


async def verify_admin(authorization: str | None) -> dict:
    """Vérifie que le porteur du token est administrateur global, en déléguant
    la vérification au backend (aucune logique JWT dupliquée ici)."""
    if not authorization:
        raise AdminAuthError(401, "Authentification requise")

    async with httpx.AsyncClient(base_url=settings.backend_url, timeout=10.0) as client:
        try:
            res = await client.get("/auth/me", headers={"Authorization": authorization})
        except httpx.HTTPError as exc:
            raise AdminAuthError(
                503, "Impossible de vérifier l'authentification"
            ) from exc

    if res.status_code != 200:
        raise AdminAuthError(401, "Authentification invalide")

    user = res.json()
    if not user.get("is_global_admin"):
        raise AdminAuthError(403, "Accès réservé aux administrateurs")
    return user
