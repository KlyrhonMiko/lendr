from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from .config import settings

assert settings.DATABASE_URL, "DATABASE_URL is required"

engine_kwargs: dict[str, object] = {
    "echo": settings.SQL_ECHO,
}

if not settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs.update(
        {
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_timeout": settings.DB_POOL_TIMEOUT_SECONDS,
            "pool_recycle": settings.DB_POOL_RECYCLE_SECONDS,
            "pool_pre_ping": settings.DB_POOL_PRE_PING,
        }
    )

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)


def init_db() -> None:
    """Create all tables that have been registered on SQLModel.metadata."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency that provides a database session per request."""
    with Session(engine) as session:
        yield session
