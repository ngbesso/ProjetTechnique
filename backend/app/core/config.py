from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://obnl:changeme@postgres:5432/obnl"
    redis_url: str = "redis://redis:6379/0"

    # Aucune valeur par défaut : une clé faible codée en dur serait un secret
    # de production trivial à deviner. Doit être fournie via l'environnement
    # (voir .env.example) — l'application refuse de démarrer sans elle.
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    s3_endpoint_url: str = "http://minio:9000"
    s3_public_url: str = "http://localhost:9000"
    s3_bucket: str = "sermons"
    minio_root_user: str = "minioadmin"
    minio_root_password: str = "minioadmin"

    ai_service_url: str = "http://ai-service:8001"

    zeffy_webhook_secret: str = ""

    admin_email: str = "admin@obnl.org"
    # Aucune valeur par défaut : voir jwt_secret_key ci-dessus, même raison.
    admin_password: str

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
    ]
    frontend_url: str = "http://localhost:5173"

    email_backend: str = "smtp"  # "console" | "smtp"
    smtp_host: str = "mailpit"
    smtp_port: int = 1025
    smtp_use_tls: bool = False  # True for production SMTP (port 587)
    smtp_username: str = ""
    smtp_password: str = ""
    email_from: str = "no-reply@mission.org"


settings = Settings()
