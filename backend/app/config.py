from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Default SQLite (zero-config) agar langsung jalan tanpa .env.
    # Untuk PostgreSQL, set DATABASE_URL di .env.
    database_url: str = "sqlite+aiosqlite:///./dev.db"
    secret_key: str = "change-me-in-production-min-32-chars-long"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@sertifikasipro.id"

    upload_dir: str = "./uploads"
    max_file_size_mb: int = 10
    allowed_extensions: str = "pdf,jpg,jpeg,png"

    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    app_env: str = "development"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_extensions_set(self) -> set[str]:
        return {e.strip().lower().lstrip(".") for e in self.allowed_extensions.split(",") if e.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
