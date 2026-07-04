from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import DEFAULT_ROLES, PERMISSIONS
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.church import Church
from app.models.parameter import ParameterValue
from app.models.setting import AppSetting
from app.models.rbac import Permission, Role, UserRole
from app.models.user import User

DEFAULT_PARAMETERS: dict[str, list[str]] = {
    "sexe": ["Masculin", "Féminin", "Autre"],
    "family_status": ["Célibataire", "Marié(e)", "Veuf(ve)", "Divorcé(e)"],
    "district": ["Ouest", "Est", "Centre", "Sud", "Outremer"],
}

MOTHER_NAME = "Église mère (Mission)"


def seed_roles_permissions(db: Session) -> None:
    """Crée (idempotent) les permissions et les rôles par défaut."""
    perms: dict[str, Permission] = {}
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


def ensure_mother_church(db: Session) -> Church:
    """Garantit l'existence de l'unique église mère (parent_id NULL)."""
    mother = db.scalar(select(Church).where(Church.parent_id.is_(None)))
    if mother is None:
        mother = Church(name=MOTHER_NAME)
        db.add(mother)
        db.flush()
    return mother


def seed_admin_user(db: Session) -> None:
    """Crée l'administrateur par défaut s'il n'existe pas et s'assure qu'il a le rôle admin."""
    mother = ensure_mother_church(db)
    admin_role = db.scalar(select(Role).where(Role.name == "admin"))
    if not admin_role:
        return

    user = db.scalar(select(User).where(User.email == settings.admin_email))
    if user is None:
        user = User(
            email=settings.admin_email,
            hashed_password=hash_password(settings.admin_password),
        )
        db.add(user)
        db.flush()
        print(f"[seed] Administrateur créé : {settings.admin_email}")

    # Assigne le rôle admin sur l'église mère si absent
    existing_assignment = db.scalar(
        select(UserRole).where(
            UserRole.user_id == user.id,
            UserRole.role_id == admin_role.id,
            UserRole.church_id == mother.id,
        )
    )
    if not existing_assignment:
        db.add(UserRole(user_id=user.id, role_id=admin_role.id, church_id=mother.id))
        print(f"[seed] Rôle admin attribué à : {settings.admin_email}")


def seed_parameters(db: Session) -> None:
    """Insère (idempotent) les valeurs de paramètres par défaut."""
    for category, labels in DEFAULT_PARAMETERS.items():
        for pos, label in enumerate(labels):
            exists = db.scalar(
                select(ParameterValue).where(
                    ParameterValue.category == category,
                    ParameterValue.label == label,
                )
            )
            if exists is None:
                db.add(ParameterValue(category=category, label=label, position=pos))


def seed_settings(db: Session) -> None:
    """Insère (idempotent) les paramètres système par défaut."""
    defaults = {"auto_approve_members": "false"}
    for key, value in defaults.items():
        if db.get(AppSetting, key) is None:
            db.add(AppSetting(key=key, value=value))


def run() -> None:
    db = SessionLocal()
    try:
        seed_roles_permissions(db)
        ensure_mother_church(db)
        seed_admin_user(db)
        seed_parameters(db)
        seed_settings(db)
        db.commit()
        print("[seed] Initialisation terminée.")
    finally:
        db.close()


def promote(email: str) -> None:
    """Donne le rôle admin à un utilisateur, porté sur l'église mère (donc partout, en cascade)."""
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        admin = db.scalar(select(Role).where(Role.name == "admin"))
        mother = ensure_mother_church(db)
        if not user or not admin:
            print("Utilisateur ou rôle admin introuvable.")
            return
        exists = db.scalar(
            select(UserRole).where(
                UserRole.user_id == user.id,
                UserRole.role_id == admin.id,
                UserRole.church_id == mother.id,
            )
        )
        if not exists:
            db.add(UserRole(user_id=user.id, role_id=admin.id, church_id=mother.id))
        db.commit()
        print(f"{email} est admin sur l'église mère (donc partout).")
    finally:
        db.close()


if __name__ == "__main__":
    run()
