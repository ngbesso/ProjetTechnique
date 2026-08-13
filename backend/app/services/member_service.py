import secrets
from datetime import datetime, timezone

from fastapi import BackgroundTasks, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.email import (
    EmailSender,
    membership_approved,
    membership_approved_invite,
    render_template,
)
from app.core.security import create_setup_token, hash_password
from app.models.member import Member, MemberStatus
from app.models.rbac import Role, UserRole
from app.models.setting import AppSetting
from app.models.user import User

_EMAIL_TAKEN = "Cette adresse courriel ne peut pas être utilisée. Veuillez en choisir une autre ou contacter l'administrateur si vous pensez qu'il s'agit d'une erreur."

DEFAULT_MEMBERSHIP_RECEIVED_TEMPLATE = (
    "Bonjour {prenom}, nous avons bien reçu votre demande. "
    "Elle sera examinée par un administrateur."
)
DEFAULT_MEMBERSHIP_APPROVED_TEMPLATE = (
    "Bonjour {prenom}, votre adhésion a été approuvée. Bienvenue !"
)
DEFAULT_MEMBERSHIP_APPROVED_INVITE_TEMPLATE = (
    "Bonjour {prenom}, votre adhésion a été approuvée. Définissez votre mot de "
    "passe pour accéder à votre espace (lien valable 48 h) :\n{lien}"
)


def get_template(db: Session, key: str, default: str) -> str:
    row = db.get(AppSetting, key)
    return row.value if row and row.value else default


def check_email_unique(db: Session, email: str, exclude_id: int | None = None) -> None:
    """Lève HTTP 409 (message générique anti-énumération) si l'email est déjà pris,
    que ce soit par une fiche Membre ou par un compte User existant."""
    query = select(Member).where(Member.email == email)
    if exclude_id is not None:
        query = query.where(Member.id != exclude_id)
    if db.scalar(query):
        raise HTTPException(409, _EMAIL_TAKEN)
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, _EMAIL_TAKEN)


def generate_member_code(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"MBR-{year}-"
    count = (
        db.scalar(
            select(func.count())
            .select_from(Member)
            .where(Member.member_code.like(f"{prefix}%"))
        )
        or 0
    )
    return f"{prefix}{count + 1:04d}"


def auto_approve_enabled(db: Session) -> bool:
    row = db.get(AppSetting, "auto_approve_members")
    return row is not None and row.value == "true"


def approve(
    member: Member,
    db: Session,
    background: BackgroundTasks,
    sender: EmailSender,
) -> None:
    """Approuve un membre : active le compte, crée/lie l'utilisateur, envoie l'email."""
    member.status = MemberStatus.active
    if not member.member_code:
        member.member_code = generate_member_code(db)

    user = db.scalar(select(User).where(User.email == member.email))
    invite_link: str | None = None
    if user is None:
        user = User(
            email=member.email,
            hashed_password=hash_password(secrets.token_urlsafe(16)),
        )
        db.add(user)
        db.flush()
        token = create_setup_token(user.id, user.token_version)
        invite_link = f"{settings.frontend_url}/definir-mot-de-passe?token={token}"
    member.user_id = user.id

    role_membre = db.scalar(select(Role).where(Role.name == "membre"))
    if role_membre:
        exists = db.scalar(
            select(UserRole).where(
                UserRole.user_id == user.id,
                UserRole.role_id == role_membre.id,
                UserRole.church_id == member.church_id,
            )
        )
        if not exists:
            db.add(
                UserRole(
                    user_id=user.id, role_id=role_membre.id, church_id=member.church_id
                )
            )

    if invite_link:
        template = get_template(
            db, "membership_approved_invite_template", DEFAULT_MEMBERSHIP_APPROVED_INVITE_TEMPLATE
        )
        message = render_template(
            template, prenom=member.first_name, nom=member.last_name, lien=invite_link
        )
        background.add_task(membership_approved_invite, sender, member.email, message)
    else:
        template = get_template(
            db, "membership_approved_template", DEFAULT_MEMBERSHIP_APPROVED_TEMPLATE
        )
        message = render_template(template, prenom=member.first_name, nom=member.last_name)
        background.add_task(membership_approved, sender, member.email, message)


def approve_all_pending(
    db: Session,
    background: BackgroundTasks,
    sender: EmailSender,
    church_ids: set[int] | None = None,
) -> int:
    """Approuve tous les membres en attente (jamais les refusés, qui ont un
    statut distinct et ne sont pas sélectionnés par ce filtre). church_ids=None
    signifie « toutes les églises » (admin global) ; un ensemble restreint
    limite l'action au périmètre d'un admin d'affiliée."""
    query = select(Member).where(Member.status == MemberStatus.pending)
    if church_ids is not None:
        query = query.where(Member.church_id.in_(church_ids))
    pending = list(db.scalars(query).all())
    for member in pending:
        approve(member, db, background, sender)
    return len(pending)
