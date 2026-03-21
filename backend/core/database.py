from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from .config import settings

assert settings.DATABASE_URL, "DATABASE_URL is required"
engine = create_engine(settings.DATABASE_URL, echo=settings.SQL_ECHO)


def init_db() -> None:
    """Create all tables that have been registered on SQLModel.metadata."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency that provides a database session per request."""
    with Session(engine) as session:
        yield session
