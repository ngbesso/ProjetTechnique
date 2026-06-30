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
        # hash mal formé en base → on refuse proprement plutôt que de crasher
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


def create_setup_token(user_id: int, hours: int = 48) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=hours)
    return jwt.encode(
        {"sub": str(user_id), "purpose": _SETUP_PURPOSE, "exp": expire},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_setup_token(token: str) -> int:
    data = jwt.decode(
        token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
    )
    if data.get("purpose") != _SETUP_PURPOSE:
        raise ValueError("Mauvais type de jeton")
    return int(data["sub"])
