from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any
from uuid import UUID
from datetime import datetime
from utils.time_utils import format_datetime

class ImportHistoryRead(BaseModel):
    id: UUID
    filename: str
    actor_id: UUID
    total_rows: int
    success_count: int
    error_count: int
    status: str
    error_log: Optional[Any] = None
    created_at: str
    
    @field_validator("created_at", mode="before")
    @classmethod
    def format_created_at(cls, v: Any) -> str:
        if isinstance(v, datetime):
            return format_datetime(v)
        return str(v)

    class Config:
        from_attributes = True

class ImportResponse(BaseModel):
    history_id: UUID
    status: str
    total: int
    success: int
    failed: int

class ExportFormat(BaseModel):
    format: str = Field(..., pattern="^(csv|xlsx)$")
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    status: Optional[str] = None
    movement_type: Optional[str] = None
