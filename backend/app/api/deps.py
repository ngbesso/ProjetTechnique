from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_member_optional(token: str = Depends(oauth2_scheme)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload
    except JWTError:
        return None


async def get_current_member(token: str = Depends(oauth2_scheme)):
    member = await get_current_member_optional(token)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Non authentifié",
        )
    return member


async def get_current_admin(token: str = Depends(oauth2_scheme)):
    member = await get_current_member(token)
    if member.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )
    return member


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants invalides",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        raise credentials_exc
    return user


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
