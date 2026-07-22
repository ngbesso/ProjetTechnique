from sqlalchemy import select
from sqlalchemy.orm import Session

from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.core.permissions import DEFAULT_ROLES, PERMISSIONS
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.church import Church
from app.models.parameter import ParameterValue
from app.models.post import Post, PostStatus
from app.models.setting import AppSetting
from app.models.rbac import Permission, Role, UserRole
from app.models.user import User

DEFAULT_PARAMETERS: dict[str, list[str]] = {
    "sexe": ["Masculin", "Féminin", "Autre"],
    "family_status": ["Célibataire", "Marié(e)", "Veuf(ve)", "Divorcé(e)"],
    "district": ["Ouest", "Est", "Centre", "Sud", "Outremer"],
    "donation_category": ["Soutien spirituel", "Action communautaire", "Développement"],
    "event_category": ["Conférence", "Colloque", "Croisade", "Retraite", "Formation"],
    "intervenant_category": ["Pasteur", "Conférencier", "Diacre"],
}

MOTHER_NAME = "Église mère (Mission)"

DEMO_POSTS: list[dict] = [
    dict(
        title="Retour sur notre semaine de prière annuelle",
        excerpt="Plus de 300 membres réunis pour une semaine de jeûne et de prière.",
        content=(
            "Cette année encore, nos Églises affiliées se sont rassemblées pour une "
            "semaine de prière marquée par une forte mobilisation communautaire. "
            "Merci à tous ceux qui ont participé, de près ou de loin, à ce moment "
            "fort de notre vie spirituelle collective."
        ),
        author="Pasteur Marc Lemaire",
        status=PostStatus.published,
        category="Vie communautaire",
    ),
    dict(
        title="Témoignage : une famille transformée par la foi",
        excerpt="L'histoire de la famille Kone, accompagnée par notre mission depuis 2020.",
        content=(
            "Il y a quatre ans, la famille Kone traversait une période difficile. "
            "Aujourd'hui, elle témoigne de la manière dont la communauté et la foi "
            "l'ont aidée à se reconstruire. Un récit d'espoir à lire absolument."
        ),
        author="Pasteure Hélène Bakayoko",
        status=PostStatus.published,
        category="Témoignages",
    ),
    dict(
        title="Nouvelle session de formation des leaders",
        excerpt="Inscriptions ouvertes pour la prochaine cohorte de formation.",
        content=(
            "Nous lançons une nouvelle session de formation destinée aux leaders "
            "de nos Églises affiliées. Au programme : gestion communautaire, "
            "counseling pastoral et développement de projets locaux."
        ),
        author="Pasteur Emmanuel Diallo",
        status=PostStatus.published,
        category="Formation",
    ),
    dict(
        title="Campagne de collecte pour le développement communautaire",
        excerpt="Objectif : soutenir trois nouveaux projets communautaires cette année.",
        content=(
            "La campagne annuelle de collecte au profit du développement "
            "communautaire est lancée. Vos dons permettront de financer des "
            "projets concrets dans les quartiers desservis par nos Églises affiliées."
        ),
        author="Pasteure Pascale Osei",
        status=PostStatus.published,
        category="Annonces",
    ),
    dict(
        title="Brouillon : bilan du trimestre (à finaliser)",
        excerpt="Notes internes en attente de relecture avant publication.",
        content=(
            "Brouillon de bilan trimestriel — statistiques de fréquentation, "
            "dons reçus et nouvelles adhésions. À compléter avant publication."
        ),
        author="Administration",
        status=PostStatus.draft,
        category="Annonces",
    ),
    dict(
        title="Ancien article archivé sur l'inauguration 2023",
        excerpt="Retour sur l'inauguration de notre église mère en 2023.",
        content=(
            "En 2023, notre église mère inaugurait officiellement ses nouveaux "
            "locaux. Cet article, désormais archivé, retrace les temps forts de "
            "cette journée mémorable."
        ),
        author="Pasteur Général André Kouassi",
        status=PostStatus.archived,
        category="Vie communautaire",
    ),
]


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
    defaults = {
        "auto_approve_members": "false",
        "zeffy_embed_path": "",
        "event_reminder_hours_before": "24",
    }
    for key, value in defaults.items():
        if db.get(AppSetting, key) is None:
            db.add(AppSetting(key=key, value=value))


def seed_posts(db: Session) -> None:
    """Insère (idempotent) des articles de blog de démonstration, pour les tests."""
    now = datetime.now(timezone.utc)
    for offset, data in enumerate(DEMO_POSTS):
        exists = db.scalar(select(Post).where(Post.title == data["title"]))
        if exists is None:
            db.add(Post(**data, created_at=now - timedelta(days=offset)))


def run() -> None:
    db = SessionLocal()
    try:
        seed_roles_permissions(db)
        ensure_mother_church(db)
        seed_admin_user(db)
        seed_parameters(db)
        seed_settings(db)
        seed_posts(db)
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
