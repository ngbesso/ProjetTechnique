from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _decode_user_id(token: str | None) -> int | None:
    """Décode le JWT et retourne l'user_id (sub), ou None si invalide."""
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except (JWTError, ValueError):
        return None


def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants invalides",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user_id = _decode_user_id(token)
    if user_id is None:
        raise credentials_exc
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_exc
    return user


def get_current_member_optional(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retourne le Member associé au token JWT, ou None si absent/invalide."""
    user_id = _decode_user_id(token)
    if user_id is None:
        return None
    from app.models.member import Member  # noqa: PLC0415

    return db.scalar(select(Member).where(Member.user_id == user_id))


def get_current_member(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
):
    """Retourne le Member associé au token JWT. Lève 401 si absent ou invalide."""
    member = get_current_member_optional(token, db)
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise ou profil membre introuvable",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return member


def get_current_admin(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Réservé aux utilisateurs avec permission globale '*' (administrateurs)."""
    if not current_user.has_global_permission("*"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )
    return current_user


def require_permissions(*required: str) -> Callable[..., User]:
    """Vérification globale (union de toutes les permissions). Utilisée par l'administration RBAC."""

    def checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        perms = user.permission_codes
        if "*" in perms or all(code in perms for code in required):
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission insuffisante",
        )

    return checker


def require_global_permission(code: str) -> Callable[..., User]:
    """Permission d'organisation : détenue via un rôle porté sur l'église mère."""

    def checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.has_global_permission(code):
            return user
        raise HTTPException(status_code=403, detail="Permission globale insuffisante")

    return checker


def require_church_permission(code: str) -> Callable[..., User]:
    """Permission scopée : lit church_id dans l'URL et applique la cascade mère -> affiliées."""

    def checker(
        church_id: int, user: Annotated[User, Depends(get_current_user)]
    ) -> User:
        if user.has_permission(code, church_id):
            return user
        raise HTTPException(
            status_code=403, detail="Permission insuffisante sur cette église"
        )

    return checker
