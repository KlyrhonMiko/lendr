from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_serializer

from utils.time_utils import format_datetime

class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    audit_id: str

    entity_type: str
    entity_id: str

    action: str
    reason_code: Optional[str] = None

    before_json: Optional[dict] = None
    after_json: Optional[dict] = None
    
    user_id: Optional[str] = None
    employee_id: Optional[str] = None
    created_at: datetime
    
    is_archived: bool = False
    archived_at: Optional[datetime] = None
    retention_tags: Optional[list[str]] = None

    @field_serializer("created_at", "archived_at")
    def serialize_dates(self, dt: datetime | None) -> str | None:
        return format_datetime(dt) if dt else None

