from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_serializer
from utils.time_utils import format_datetime

class SystemStatusRead(BaseModel):
    # Overall Status Cards
    registry_status: str = Field(..., description="e.g., 'Connected'")
    database_health: str = Field(..., description="e.g., 'Healthy'")
    uptime_formatted: str = Field(..., description="e.g., '45d 04h 12m'")
    
    # Internal metrics (for charts if needed)
    uptime_seconds: float
    cpu_usage_percent: float
    memory_usage_percent: float
    active_db_connections: int

class StorageBreakdownRead(BaseModel):
    database: int = Field(..., description="Bytes used by the database")
    logs: int = Field(..., description="Bytes used by health logs")
    attachments: int = Field(..., description="Bytes used by file uploads")
    backups: int = Field(..., description="Bytes used by system backups")
    other: int = Field(..., description="Remaining space")

class StorageInfoRead(BaseModel):
    total_space_bytes: int
    used_space_bytes: int
    free_space_bytes: int
    breakdown: StorageBreakdownRead

class ActiveUserRead(BaseModel):
    id: UUID
    username: str
    full_name: str | None = None
    role_name: str | None = None

class ActiveSessionRead(BaseModel):
    session_id: str
    user: ActiveUserRead | None = None
    issued_at: datetime
    expires_at: datetime
    device_id: str | None = None

    @field_serializer("issued_at", "expires_at")
    def serialize_dates(self, dt: datetime) -> str:
        return format_datetime(dt)

class LogEntryRead(BaseModel):
    timestamp: datetime
    code: str = Field(..., description="Error code e.g., '500-INTERNAL'")
    message: str = Field(..., description="Description of the event")
    level: str = Field(..., description="Original log level")
    severity: str = Field(..., description="UI-friendly severity: 'Critical', 'Warning', 'Info'")

    @field_serializer("timestamp")
    def serialize_timestamp(self, dt: datetime) -> str:
        return format_datetime(dt)

    model_config = ConfigDict(from_attributes=True)
