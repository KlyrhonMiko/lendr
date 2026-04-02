import logging
import sys
from pathlib import Path
from logging.handlers import TimedRotatingFileHandler

from core.request_context import get_correlation_id

# ANSI colors for console output
COLORS = {
    "DEBUG": "\033[94m",    # Blue
    "INFO": "\033[92m",     # Green
    "WARNING": "\033[93m",  # Yellow
    "ERROR": "\033[91m",    # Red
    "CRITICAL": "\033[95m", # Magenta
    "RESET": "\033[0m",
    "BOLD": "\033[1m",
    "CYAN": "\033[96m",
}


class CorrelationIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = get_correlation_id()
        return True

class ColoredFormatter(logging.Formatter):
    """Custom formatter for terminal output with colors."""
    def format(self, record):
        levelname = record.levelname
        color = COLORS.get(levelname, COLORS["RESET"])
        reset = COLORS["RESET"]
        bold = COLORS["BOLD"]
        
        # Timestamp in gray/cyan
        timestamp = self.formatTime(record, self.datefmt)
        
        # Source module (e.g. core.init)
        source = f"{bold}{COLORS['CYAN']}[{record.name}]{reset}"
        correlation_id = getattr(record, "correlation_id", "-")
        
        # Format: [TIME] [LEVEL] [SOURCE] MESSAGE
        message = super().format(record)
        
        # Replace the levelname with a colored version
        log_fmt = (
            f"{COLORS['RESET']}{timestamp} {bold}{color}{levelname:<8}{reset} "
            f"{source} [cid={correlation_id}] {message}"
        )
        return log_fmt

def setup_logging(log_level: str = "INFO", log_dir: str = ".logs"):
    """Initialize system-wide logging with Console and File handlers."""
    
    # Ensure log directory exists
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)
    
    app_log_file = log_path / "backend.log"
    
    # Root Logger
    logger = logging.getLogger()
    logger.setLevel(log_level)
    
    # Remove existing handlers to avoid duplicates
    if logger.hasHandlers():
        logger.handlers.clear()

    correlation_filter = CorrelationIdFilter()
    logger.addFilter(correlation_filter)
        
    # 1. Console Handler (Colored)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(ColoredFormatter("%(message)s", datefmt="%Y-%m-%d %H:%M:%S"))
    console_handler.addFilter(correlation_filter)
    logger.addHandler(console_handler)
    
    # 2. File Handler (Rotating)
    # Categorizes all backend events with timestamps, levels, and origins.
    file_handler = TimedRotatingFileHandler(
        app_log_file, when="midnight", interval=1, backupCount=30, encoding="utf-8"
    )
    file_formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)-8s] [%(name)s] [cid=%(correlation_id)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    file_handler.setFormatter(file_formatter)
    file_handler.addFilter(correlation_filter)
    logger.addHandler(file_handler)
    
    # Suppress noisy third-party loggers if needed
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    return logger

def setup_health_logging(log_file: str = ".logs/health/health.log"):
    """
    Initialize a separate logger for System Health / Operational metrics.
    This file is intended for long-term health monitoring and user-facing dashboards.
    """
    # Ensure health log directory exists
    log_file_path = Path(log_file)
    log_file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Health Logger
    health_logger = logging.getLogger("health")
    health_logger.setLevel(logging.INFO)
    health_logger.propagate = False # Prevent health logs from cluttering the main backend.log if they share the root logger
    
    # Avoid duplicate handlers if already setup
    if health_logger.handlers:
        return health_logger
        
    # File Handler (Simple rotating for health)
    handler = TimedRotatingFileHandler(
        log_file, when="midnight", interval=1, backupCount=90, encoding="utf-8"
    )
    # Match the format expected by HealthService re.compile(r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] (.+)$")
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)
    health_logger.addHandler(handler)
    
    return health_logger

def log_operation(code: str, message: str, level: str = "INFO"):
    """
    Log an operational event specifically formatted for the System Health dashboard.
    Format: [CODE] Description
    """
    health_logger = logging.getLogger("health")
    # If health logging isn't setup yet, it will just use defaults (usually stdout)
    # This ensures calls to log_operation record structured data.
    formatted_msg = f"[{code}] {message}"
    
    level_num = getattr(logging, level.upper(), logging.INFO)
    health_logger.log(level_num, formatted_msg)

# Convenience function to get loggers for specific modules
def get_logger(name: str):
    return logging.getLogger(name)
