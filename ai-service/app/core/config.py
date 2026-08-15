from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ollama_url: str = "http://ollama:11434"
    ollama_model: str = "llama3.2:3b"
    backend_url: str = "http://backend:8000"
    sync_interval_seconds: int = 300

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
    ]


settings = Settings()
