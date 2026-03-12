from datetime import datetime, timedelta, timezone
from typing import Optional

# Manila is GMT+8
MANILA_TZ = timezone(timedelta(hours=8))

def get_now_manila() -> datetime:
    """Returns the current datetime in Manila timezone (GMT+8)."""
    return datetime.now(MANILA_TZ)

def format_datetime(dt: Optional[datetime]) -> str:
    """Formats a datetime object as MM/DD/YYYY - HH:MM:SS."""
    if not dt:
        return ""
    
    # Ensure it's in Manila time
    if dt.tzinfo is None:
        # If naive, we assume it's UTC (standard practice for DB) and convert to Manila
        dt = dt.replace(tzinfo=timezone.utc).astimezone(MANILA_TZ)
    else:
        dt = dt.astimezone(MANILA_TZ)
    
    return dt.strftime("%m/%d/%Y - %H:%M:%S")
