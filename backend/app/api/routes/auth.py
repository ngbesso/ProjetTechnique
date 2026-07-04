from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.email import EmailSender, get_email_sender, password_reset_email
from app.core.security import (
    create_access_token,
    create_reset_token,
    decode_reset_token,
    decode_setup_token,
    hash_password,
    verify_password,
)
from app.core.config import settings
from app.db.session import get_db
from app.models.church import Church
from app.models.rbac import Role, UserRole
from app.models.user import User
from app.schemas.user import (
    ForgotPasswordRequest,
    SetPasswordRequest,
    Token,
    UserCreate,
    UserRead,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_MIN_PASSWORD_LENGTH = 8


def to_read(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "roles": sorted({a.role.name for a in user.role_assignments}),
        "permissions": sorted(user.permission_codes),
        "is_global_admin": user.has_global_permission("*"),
    }


def _apply_new_password(user: User, password: str, db: Session) -> Token:
    """Met à jour le mot de passe, incrémente token_version et retourne un access token."""
    if len(password) < _MIN_PASSWORD_LENGTH:
        raise HTTPException(
            422, f"Mot de passe trop court ({_MIN_PASSWORD_LENGTH} caractères minimum)"
        )
    user.hashed_password = hash_password(password)
    user.is_active = True
    user.token_version += 1
    db.commit()
    return Token(access_token=create_access_token(subject=str(user.id)))


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Annotated[Session, Depends(get_db)]):
    if db.scalar(select(User).where(User.email == data.email)):
        raise HTTPException(status_code=409, detail="Cet e-mail est déjà utilisé")
    user = User(email=data.email, hashed_password=hash_password(data.password))
    db.add(user)
    db.flush()
    membre = db.scalar(select(Role).where(Role.name == "membre"))
    mother = db.scalar(select(Church).where(Church.parent_id.is_(None)))
    if membre and mother:
        db.add(UserRole(user_id=user.id, role_id=membre.id, church_id=mother.id))
    db.commit()
    db.refresh(user)
    return to_read(user)


@router.post("/login", response_model=Token)
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.scalar(select(User).where(User.email == form.username))
    if (
        not user
        or not user.is_active
        or not verify_password(form.password, user.hashed_password)
    ):
        raise HTTPException(status_code=401, detail="E-mail ou mot de passe incorrect")
    return Token(access_token=create_access_token(subject=str(user.id)))


@router.get("/me", response_model=UserRead)
def me(current_user: Annotated[User, Depends(get_current_user)]):
    return to_read(current_user)


@router.post("/set-password", response_model=Token)
def set_password(data: SetPasswordRequest, db: Annotated[Session, Depends(get_db)]):
    """Active un nouveau compte via le lien d'invitation envoyé à l'approbation du membre."""
    try:
        user_id, token_ver = decode_setup_token(data.token)
    except Exception:
        raise HTTPException(400, "Lien invalide ou expiré")
    user = db.get(User, user_id)
    if not user or token_ver != user.token_version:
        raise HTTPException(400, "Lien invalide ou expiré")
    return _apply_new_password(user, data.password, db)


@router.post("/forgot-password", status_code=204)
def forgot_password(
    data: ForgotPasswordRequest,
    background: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    sender: Annotated[EmailSender, Depends(get_email_sender)],
):
    """Envoie un lien de réinitialisation si l'e-mail correspond à un compte actif.

    Répond toujours 204 pour ne pas révéler l'existence du compte.
    """
    user = db.scalar(select(User).where(User.email == data.email))
    if user and user.is_active:
        token = create_reset_token(user.id, user.token_version)
        link = f"{settings.frontend_url}/?reset={token}"
        background.add_task(password_reset_email, sender, user.email, link)


@router.post("/reset-password", response_model=Token)
def reset_password(data: SetPasswordRequest, db: Annotated[Session, Depends(get_db)]):
    """Réinitialise le mot de passe via le lien envoyé par forgot-password."""
    try:
        user_id, token_ver = decode_reset_token(data.token)
    except Exception:
        raise HTTPException(400, "Lien invalide ou expiré")
    user = db.get(User, user_id)
    if not user or token_ver != user.token_version:
        raise HTTPException(400, "Lien invalide ou expiré")
    return _apply_new_password(user, data.password, db)
