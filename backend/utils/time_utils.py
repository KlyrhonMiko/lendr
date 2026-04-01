from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from utils.logging import get_logger

# Default: Manila is GMT+8
DEFAULT_TZ = ZoneInfo("Asia/Manila")
MANILA_TZ = DEFAULT_TZ # Alias for existing system services

# Shared state for the application (Display only)
CURRENT_DISPLAY_TZ = DEFAULT_TZ
CURRENT_DATE_FORMAT = "%m/%d/%Y"
CURRENT_TIME_FORMAT = "%I:%M:%S %p"
logger = get_logger("utils.time")

def get_now_manila() -> datetime:
    """
    Returns the current datetime in the baseline Manila timezone (GMT+8).
    Always use this for internal system timestamps to ensure DB consistency.
    """
    return datetime.now(DEFAULT_TZ)

def update_system_timezone(tz_name: str) -> bool:
    """Updates the internal display timezone singleton."""
    global CURRENT_DISPLAY_TZ
    try:
        CURRENT_DISPLAY_TZ = ZoneInfo(tz_name)
        logger.info("Display timezone updated to %s", tz_name)
        return True
    except (ZoneInfoNotFoundError, ValueError):
        CURRENT_DISPLAY_TZ = DEFAULT_TZ
        logger.warning("Invalid timezone '%s'; falling back to Asia/Manila", tz_name)
        return False

def update_system_format(date_format: str, time_format: str):
    """Updates the internal formatting patterns."""
    global CURRENT_DATE_FORMAT, CURRENT_TIME_FORMAT
    
    # Mapping for Date Formats
    date_map = {
        "MM/DD/YYYY": "%m/%d/%Y",
        "DD/MM/YYYY": "%d/%m/%Y",
        "YYYY-MM-DD": "%Y-%m-%d"
    }
    CURRENT_DATE_FORMAT = date_map.get(date_format, "%m/%d/%Y")
    
    # Mapping for Time Formats
    if time_format == "24h":
        CURRENT_TIME_FORMAT = "%H:%M:%S"
    else:
        CURRENT_TIME_FORMAT = "%I:%M:%S %p"

def format_datetime(dt: Optional[datetime]) -> str:
    """Formats a datetime object based on current system localization settings."""
    if not dt:
        return ""
    
    # Core Translation Logic:
    # 1. If naive, assume it's Manila time (the storage baseline)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=DEFAULT_TZ)
    
    # 2. Convert to the current display timezone
    dt = dt.astimezone(CURRENT_DISPLAY_TZ)
    
    pattern = f"{CURRENT_DATE_FORMAT} - {CURRENT_TIME_FORMAT}"
    return dt.strftime(pattern)
