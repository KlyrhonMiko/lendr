from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_serializer

from utils.time_utils import format_datetime

class AuditLogRead(BaseModel):
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

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> str:
        return format_datetime(dt)

    class Config:
        from_attributes = True
