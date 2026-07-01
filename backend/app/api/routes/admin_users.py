from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_global_permission
from app.db.session import get_db
from app.models.church import Church
from app.models.rbac import Role, UserRole
from app.models.user import User
from app.schemas.user import (
    RoleAssignmentInput,
    RoleAssignmentRead,
    UserActiveUpdate,
    UserAdminRead,
)

router = APIRouter(prefix="/admin", tags=["admin-users"])
manage_users = Depends(require_global_permission("user:manage"))
manage_rbac = Depends(require_global_permission("rbac:manage"))


def _to_read(u: User) -> UserAdminRead:
    return UserAdminRead(
        id=u.id,
        email=u.email,
        is_active=u.is_active,
        created_at=u.created_at,
        assignments=[
            RoleAssignmentRead(
                role=a.role.name,
                role_id=a.role_id,
                church_id=a.church_id,
                church_name=a.church.name,
            )
            for a in u.role_assignments
        ],
    )


@router.get("/users", response_model=list[UserAdminRead], dependencies=[manage_users])
def list_users(db: Annotated[Session, Depends(get_db)]):
    return [_to_read(u) for u in db.scalars(select(User).order_by(User.email)).all()]


@router.patch(
    "/users/{user_id}", response_model=UserAdminRead, dependencies=[manage_users]
)
def set_user_active(
    user_id: int, data: UserActiveUpdate, db: Annotated[Session, Depends(get_db)]
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    return _to_read(user)


@router.post("/role-assignments", status_code=201, dependencies=[manage_rbac])
def assign_role(data: RoleAssignmentInput, db: Annotated[Session, Depends(get_db)]):
    if not db.get(User, data.user_id):
        raise HTTPException(404, "Utilisateur introuvable")
    if not db.get(Role, data.role_id):
        raise HTTPException(404, "Rôle introuvable")
    if not db.get(Church, data.church_id):
        raise HTTPException(404, "Église introuvable")
    exists = db.scalar(
        select(UserRole).where(
            UserRole.user_id == data.user_id,
            UserRole.role_id == data.role_id,
            UserRole.church_id == data.church_id,
        )
    )
    if exists:
        raise HTTPException(409, "Cette attribution existe déjà")
    db.add(UserRole(**data.model_dump()))
    db.commit()
    return {"status": "ok"}


@router.delete("/role-assignments", status_code=204, dependencies=[manage_rbac])
def revoke_role(
    user_id: int, role_id: int, church_id: int, db: Annotated[Session, Depends(get_db)]
):
    assignment = db.get(UserRole, (user_id, role_id, church_id))
    if assignment:
        db.delete(assignment)
        db.commit()
