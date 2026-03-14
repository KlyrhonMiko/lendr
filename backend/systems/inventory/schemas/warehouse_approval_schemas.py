from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_serializer
from utils.time_utils import format_datetime

class WarehouseApprovalBase(BaseModel):
    remarks: Optional[str] = Field(default=None, max_length=500)

class WarehouseApprovalCreate(WarehouseApprovalBase):
    borrow_id: str
    printable_payload_json: dict = Field(default_factory=dict)

class WarehouseApprovalRead(WarehouseApprovalBase):
    id: UUID
    borrow_id: str
    approved_by: UUID
    approved_at: datetime
    printable_payload_json: dict

    @field_serializer("approved_at")
    def serialize_date(self, dt: datetime) -> str:
        return format_datetime(dt)

    class Config:
        from_attributes = True
