from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.permissions import DEFAULT_ROLES, PERMISSIONS
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.rbac import Permission, Role
from app.models.user import User


def seed_roles_permissions(db: Session) -> None:
    perms = {}
    for code, desc in PERMISSIONS.items():
        p = db.scalar(select(Permission).where(Permission.code == code))
        if p is None:
            p = Permission(code=code, description=desc)
            db.add(p)
        perms[code] = p
    db.flush()
    for name, cfg in DEFAULT_ROLES.items():
        role = db.scalar(select(Role).where(Role.name == name))
        if role is None:
            role = Role(name=name, description=cfg["description"])
            db.add(role)
        role.permissions = [perms[c] for c in cfg["permissions"]]


def seed_admin_user(db: Session) -> None:
    """Crée l'utilisateur admin par défaut s'il n'existe pas encore."""
    from app.core.config import settings

    existing = db.scalar(select(User).where(User.email == settings.admin_email))
    if existing:
        return

    admin_role = db.scalar(select(Role).where(Role.name == "admin"))
    user = User(
        email=settings.admin_email,
        hashed_password=hash_password(settings.admin_password),
    )
    if admin_role:
        user.roles.append(admin_role)
    db.add(user)
    print(f"[seed] Administrateur créé : {settings.admin_email}")


def run() -> None:
    db = SessionLocal()
    try:
        seed_roles_permissions(db)
        seed_admin_user(db)
        db.commit()
        print("[seed] Initialisation terminée.")
    finally:
        db.close()


def promote(email: str) -> None:
    """Donne le rôle admin à un utilisateur existant."""
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        admin = db.scalar(select(Role).where(Role.name == "admin"))
        if not user or not admin:
            print("Utilisateur ou rôle admin introuvable.")
            return
        if admin not in user.roles:
            user.roles.append(admin)
        db.commit()
        print(f"{email} est maintenant administrateur.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
