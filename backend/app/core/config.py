from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://obnl:changeme@postgres:5432/obnl"
    redis_url: str = "redis://redis:6379/0"

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    s3_endpoint_url: str = "http://minio:9000"
    s3_bucket: str = "sermons"
    minio_root_user: str = "minioadmin"
    minio_root_password: str = "minioadmin"
    minio_public_url: str = "http://localhost:9000"

    ai_service_url: str = "http://ai-service:8001"

    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()
