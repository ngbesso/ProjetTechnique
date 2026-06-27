from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_permissions
from app.db.session import get_db
from app.models.rbac import Permission, Role
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["administration"])
admin_only = Depends(require_permissions("rbac:manage"))


class RoleIn(BaseModel):
    name: str
    description: str = ""

class SetPermissions(BaseModel):
    codes: list[str]

class SetUserRoles(BaseModel):
    roles: list[str]

def role_out(r: Role) -> dict:
    return {"id": r.id, "name": r.name, "description": r.description,
            "permissions": [p.code for p in r.permissions]}


@router.get("/permissions", dependencies=[admin_only])
def list_permissions(db: Annotated[Session, Depends(get_db)]):
    return [{"code": p.code, "description": p.description}
            for p in db.scalars(select(Permission)).all()]


@router.get("/roles", dependencies=[admin_only])
def list_roles(db: Annotated[Session, Depends(get_db)]):
    return [role_out(r) for r in db.scalars(select(Role)).all()]


@router.post("/roles", dependencies=[admin_only], status_code=201)
def create_role(data: RoleIn, db: Annotated[Session, Depends(get_db)]):
    if db.scalar(select(Role).where(Role.name == data.name)):
        raise HTTPException(409, "Ce rôle existe déjà")
    role = Role(name=data.name, description=data.description)
    db.add(role); db.commit(); db.refresh(role)
    return role_out(role)


@router.put("/roles/{role_id}/permissions", dependencies=[admin_only])
def set_role_permissions(role_id: int, data: SetPermissions,
                         db: Annotated[Session, Depends(get_db)]):
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(404, "Rôle introuvable")
    perms = db.scalars(select(Permission).where(Permission.code.in_(data.codes))).all()
    role.permissions = list(perms)
    db.commit()
    return role_out(role)


@router.put("/users/{user_id}/roles", dependencies=[admin_only])
def set_user_roles(user_id: int, data: SetUserRoles,
                   db: Annotated[Session, Depends(get_db)]):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    roles = db.scalars(select(Role).where(Role.name.in_(data.roles))).all()
    user.roles = list(roles)
    db.commit()
    return {"user_id": user.id, "roles": [r.name for r in user.roles]}