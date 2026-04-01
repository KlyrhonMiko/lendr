import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _find_env_file(names=(".env.local", ".env")) -> str | None:
    start = Path(__file__).resolve()
    for parent in (start.parent, *start.parents):
        for name in names:
            candidate = parent / name
            if candidate.exists():
                return str(candidate)
    return os.getenv("ENV_FILE")

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_find_env_file(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str | None = None
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 5000
    DEBUG: bool = False
    SQL_ECHO: bool = False
    LOG_LEVEL: str = "INFO"
    LOG_DIR: str = ".logs"
    SKIP_INIT: bool = False

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_ISSUER: str | None = None
    JWT_AUDIENCE: str | None = None

    ARGON2_TIME_COST: int = 3
    ARGON2_MEMORY_COST: int = 65536
    ARGON2_PARALLELISM: int = 4
    ARGON2_HASH_LEN: int = 32
    ARGON2_SALT_SIZE: int = 16

    INITIAL_ADMIN_USERNAME: str = "admin"
    INITIAL_ADMIN_PASSWORD: str | None = None
    ALLOW_INSECURE_DEV_DEFAULT_ADMIN: bool = False

settings = Settings()
if not settings.DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required — set it in the environment or .env(.local) file.")