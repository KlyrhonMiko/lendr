import logging
import sys
from pathlib import Path
from logging.handlers import TimedRotatingFileHandler

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
        
        # Format: [TIME] [LEVEL] [SOURCE] MESSAGE
        message = super().format(record)
        
        # Replace the levelname with a colored version
        log_fmt = f"{COLORS['RESET']}{timestamp} {bold}{color}{levelname:<8}{reset} {source} {message}"
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
        
    # 1. Console Handler (Colored)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(ColoredFormatter("%(message)s", datefmt="%Y-%m-%d %H:%M:%S"))
    logger.addHandler(console_handler)
    
    # 2. File Handler (Rotating)
    # Categorizes all backend events with timestamps, levels, and origins.
    file_handler = TimedRotatingFileHandler(
        app_log_file, when="midnight", interval=1, backupCount=30, encoding="utf-8"
    )
    file_formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)-8s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)
    
    # Suppress noisy third-party loggers if needed
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    return logger

# Convenience function to get loggers for specific modules
def get_logger(name: str):
    return logging.getLogger(name)
