"""One-shot bootstrap for migrations and initialization.

Usage:
    python data/bootstrap_system.py

This script is intended for controlled deployment/bootstrap flows where
runtime startup should avoid implicit side effects.
"""

import sys
import time
from pathlib import Path

from sqlmodel import Session
from sqlalchemy import text


sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.config import settings
from core.database import engine
from core.initialization_service import InitializationService
from utils.logging import get_logger, setup_logging
from utils.migrations import run_migrations


def bootstrap_system() -> None:
    setup_logging(log_level=settings.LOG_LEVEL, log_dir=settings.LOG_DIR)
    logger = get_logger("bootstrap")

    max_attempts = 30
    delay_seconds = 2
    for attempt in range(1, max_attempts + 1):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            break
        except Exception as exc:
            if attempt == max_attempts:
                raise RuntimeError(
                    "Database did not become ready during bootstrap"
                ) from exc
            logger.warning(
                "Database not ready yet (%s/%s): %s",
                attempt,
                max_attempts,
                str(exc),
            )
            time.sleep(delay_seconds)

    logger.info("Starting one-shot bootstrap: migrations + initialization")
    run_migrations()

    with Session(engine) as session:
        InitializationService().run(session)

    logger.info("One-shot bootstrap completed successfully")


if __name__ == "__main__":
    bootstrap_system()
