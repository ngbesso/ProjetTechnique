from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserRead
from app.models.rbac import Role


def to_read(user: User) -> dict:
    return {
        "id": user.id, "email": user.email, "is_active": user.is_active,
        "created_at": user.created_at,
        "roles": [r.name for r in user.roles],
        "permissions": sorted(user.permission_codes),
    }

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Annotated[Session, Depends(get_db)]):
    if db.scalar(select(User).where(User.email == data.email)):
        raise HTTPException(status_code=409, detail="Cet e-mail est déjà utilisé")
    user = User(email=data.email, hashed_password=hash_password(data.password))
    membre = db.scalar(select(Role).where(Role.name == "membre"))
    if membre:
        user.roles.append(membre)
    db.add(user)
    db.commit()
    db.refresh(user)
    return to_read(user)


@router.post("/login", response_model=Token)
def login(
        form: Annotated[OAuth2PasswordRequestForm, Depends()],
        db: Annotated[Session, Depends(get_db)],
):
    user = db.scalar(select(User).where(User.email == form.username))
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="E-mail ou mot de passe incorrect")
    return Token(access_token=create_access_token(subject=str(user.id)))


@router.get("/me", response_model=UserRead)
def me(current_user: Annotated[User, Depends(get_current_user)]):
    return to_read(current_user)