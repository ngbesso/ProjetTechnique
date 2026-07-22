from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    pw = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    pw = plain.encode("utf-8")[:72]
    try:
        return bcrypt.checkpw(pw, hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(
        payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )


_SETUP_PURPOSE = "set_password"
_RESET_PURPOSE = "reset_password"


def create_setup_token(user_id: int, token_version: int, hours: int = 48) -> str:
    """Jeton d'activation pour un nouveau compte (envoyé à l'approbation du membre)."""
    expire = datetime.now(timezone.utc) + timedelta(hours=hours)
    return jwt.encode(
        {
            "sub": str(user_id),
            "purpose": _SETUP_PURPOSE,
            "ver": token_version,
            "exp": expire,
        },
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_setup_token(token: str) -> tuple[int, int]:
    """Décode le jeton d'activation. Retourne (user_id, token_version)."""
    data = jwt.decode(
        token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
    )
    if data.get("purpose") != _SETUP_PURPOSE:
        raise ValueError("Mauvais type de jeton")
    return int(data["sub"]), int(data.get("ver", -1))


def create_reset_token(user_id: int, token_version: int, hours: int = 2) -> str:
    """Jeton de réinitialisation du mot de passe (valable 2 h)."""
    expire = datetime.now(timezone.utc) + timedelta(hours=hours)
    return jwt.encode(
        {
            "sub": str(user_id),
            "purpose": _RESET_PURPOSE,
            "ver": token_version,
            "exp": expire,
        },
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_reset_token(token: str) -> tuple[int, int]:
    """Décode le jeton de réinitialisation. Retourne (user_id, token_version)."""
    data = jwt.decode(
        token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
    )
    if data.get("purpose") != _RESET_PURPOSE:
        raise ValueError("Mauvais type de jeton")
    return int(data["sub"]), int(data.get("ver", -1))


_CANCEL_REGISTRATION_PURPOSE = "cancel_registration"


def create_cancel_registration_token(registration_id: int, expires_at: datetime) -> str:
    """Jeton d'annulation d'inscription (invité sans compte), envoyé par courriel.

    Expire à la date de début de l'événement : au-delà, l'annulation n'a plus de sens.
    """
    return jwt.encode(
        {
            "sub": str(registration_id),
            "purpose": _CANCEL_REGISTRATION_PURPOSE,
            "exp": expires_at,
        },
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_cancel_registration_token(token: str) -> int:
    """Décode le jeton d'annulation. Retourne l'id de l'inscription."""
    data = jwt.decode(
        token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
    )
    if data.get("purpose") != _CANCEL_REGISTRATION_PURPOSE:
        raise ValueError("Mauvais type de jeton")
    return int(data["sub"])
