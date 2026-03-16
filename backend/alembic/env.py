import importlib
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel
from sqlmodel.main import AutoString

from alembic import context
from core.config import settings

# Ensure the backend directory is on sys.path so imports work when alembic
# is invoked from anywhere (e.g. from the project root or inside Docker).
_backend_dir = str(Path(__file__).resolve().parents[1])
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

# Auto-discover and import every `systems/<name>/models` package so that all
# SQLModel tables are registered on SQLModel.metadata before autogenerate runs.
_systems_dir = Path(__file__).resolve().parents[1] / "systems"
for _system_dir in sorted(_systems_dir.iterdir()):
    if _system_dir.is_dir() and not _system_dir.name.startswith("_"):
        importlib.import_module(f"systems.{_system_dir.name}.models")

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Pull DATABASE_URL from app settings so there is a single source of truth.
assert settings.DATABASE_URL, "DATABASE_URL is required"
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

target_metadata = SQLModel.metadata


def render_item(type_: str, obj: object, autogen_context: object) -> str | bool:
    """Render SQLModel's AutoString as plain SQLAlchemy String/Text so that
    generated migrations only depend on sqlalchemy, not sqlmodel."""
    if type_ == "type" and isinstance(obj, AutoString):
        if obj.length:
            return f"sa.String(length={obj.length})"
        return "sa.Text()"
    return False


# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_item=render_item,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:  # noqa: D401
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_item=render_item,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
