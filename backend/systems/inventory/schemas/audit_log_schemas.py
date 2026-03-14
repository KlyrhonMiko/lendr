from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel

class AuditLogRead(BaseModel):
    audit_id: str
    entity_type: str
    entity_id: str
    action: str
    before_json: Optional[dict] = None
    after_json: Optional[dict] = None
    actor_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True
