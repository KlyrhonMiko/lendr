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
    LOG_FILE_ENABLED: bool = True
    SKIP_INIT: bool = False
    STARTUP_RUN_INITIALIZATION: bool = True
    STARTUP_ENABLE_SCHEDULER: bool = False
    STARTUP_FAIL_FAST_ON_SCHEDULER_ERROR: bool = True

    SECURITY_HEADERS_ENABLED: bool = True
    SECURITY_HSTS_MAX_AGE_SECONDS: int = 31536000
    SECURITY_API_CONTENT_SECURITY_POLICY: str = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"

    SWAGGER_UI_ENABLED: bool = True

    CORS_ALLOW_ORIGINS: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "https://localhost:3000,https://127.0.0.1:3000"
    )
    CORS_ALLOW_METHODS: str = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    CORS_ALLOW_HEADERS: str = "Authorization,Content-Type,X-Device-ID"
    CORS_ALLOW_CREDENTIALS: bool = True

    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT_SECONDS: int = 30
    DB_POOL_RECYCLE_SECONDS: int = 1800
    DB_POOL_PRE_PING: bool = True

    IMPORT_MAX_CSV_SIZE_BYTES: int = 5242880

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_ISSUER: str | None = None
    JWT_AUDIENCE: str | None = None

    AUTH_SESSION_INACTIVITY_TIMEOUT_MINUTES: int = 30
    AUTH_ACTIVITY_TOUCH_INTERVAL_SECONDS: int = 60
    AUTH_MAX_ACTIVE_USER_SESSIONS: int = 3
    AUTH_MAX_ACTIVE_BORROWER_SESSIONS: int = 1
    AUTH_RATE_LIMIT_IP_MAX_ATTEMPTS: int = 5
    AUTH_RATE_LIMIT_IP_WINDOW_SECONDS: int = 60
    AUTH_RATE_LIMIT_IDENTITY_MAX_ATTEMPTS: int = 20
    AUTH_RATE_LIMIT_IDENTITY_WINDOW_SECONDS: int = 3600
    AUTH_TRUST_PROXY_HEADERS: bool = False
    AUTH_TRUSTED_PROXY_HOPS: int = 1

    ARGON2_TIME_COST: int = 3
    ARGON2_MEMORY_COST: int = 65536
    ARGON2_PARALLELISM: int = 4
    ARGON2_HASH_LEN: int = 32
    ARGON2_SALT_SIZE: int = 16

    INITIAL_ADMIN_USERNAME: str = "admin"
    INITIAL_ADMIN_PASSWORD: str | None = None
    ALLOW_INSECURE_DEV_DEFAULT_ADMIN: bool = False

    # SMTP Settings
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str = "noreply@powergold.app"
    SMTP_FROM_NAME: str = "PowerGold System"
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    SMTP_TIMEOUT: int = 10

settings = Settings()
if not settings.DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required — set it in the environment or .env(.local) file.")
