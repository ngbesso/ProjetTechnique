from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)


def get_current_member(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Dépendance JWT obligatoire — lève 401 si le token est absent ou invalide."""
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        member_id: str | None = payload.get("sub")
        if member_id is None:
            raise ValueError
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Import local pour éviter la circularité avec les modèles
    from app.models.member import Member  # noqa: PLC0415

    member = db.get(Member, int(member_id))
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Membre introuvable",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return member


def get_current_member_optional(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Dépendance JWT optionnelle — retourne None si aucun token valide."""
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        member_id: str | None = payload.get("sub")
        if member_id is None:
            return None
    except JWTError:
        return None

    from app.models.member import Member  # noqa: PLC0415

    return db.get(Member, int(member_id))


def get_current_admin(
    current_member=Depends(get_current_member),
):
    """Dépendance réservée aux administrateurs."""
    if not getattr(current_member, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )
    return current_member
