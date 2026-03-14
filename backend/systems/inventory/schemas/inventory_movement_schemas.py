from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_serializer
from utils.time_utils import format_datetime

class InventoryMovementRead(BaseModel):
    qty_change: int
    movement_type: str
    reference_id: Optional[str] = None
    note: Optional[str] = None
    occurred_at: datetime

    @field_serializer("occurred_at")
    def serialize_date(self, dt: datetime) -> str:
        return format_datetime(dt)

    class Config:
        from_attributes = True
