from alembic import command
from alembic.config import Config
from pathlib import Path
from utils.logging import get_logger

logger = get_logger("core.migrations")

def run_migrations():
    """
    Programmatically run all pending Alembic migrations.
    Brings the database schema up to the 'head' revision.
    """
    # Path to the backend directory where alembic.ini resides
    backend_dir = Path(__file__).resolve().parents[1]
    ini_path = backend_dir / "alembic.ini"
    
    if not ini_path.exists():
        logger.error(f"Alembic configuration not found at {ini_path}")
        return

    logger.info("Checking for pending database migrations...")
    
    try:
        # Initialize Alembic config from the ini file
        alembic_cfg = Config(str(ini_path))
        
        # Avoid resetting our custom logging during the programmatic run
        alembic_cfg.set_main_option("skip_logging", "true")
        
        # Explicitly set the script_location to ensure it's absolute
        # This prevents issues when running from different CWDs
        script_location = backend_dir / "alembic"
        alembic_cfg.set_main_option("script_location", str(script_location))
        
        # Run the 'upgrade head' command
        command.upgrade(alembic_cfg, "head")
        logger.info("Database schema is up to date (Alembic head).")
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}", exc_info=True)
        # We re-raise to prevent the app from starting on a broken/stale schema
        raise e
