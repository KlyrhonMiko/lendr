from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, field_serializer
from utils.time_utils import format_datetime

class InventoryBatchBase(BaseModel):
    expiration_date: Optional[datetime] = None

class InventoryBatchCreate(InventoryBatchBase):
    """Create a new batch (Metadata only). Initial quantity is 0."""
    pass

class InventoryBatchUpdate(BaseModel):
    """Update batch metadata (status and/or expiration)."""
    expiration_date: Optional[datetime] = None
    status: Optional[str] = Field(default=None, max_length=50)

class InventoryBatchRead(InventoryBatchBase):
    """Batch read schema with server-assigned fields."""
    batch_id: str
    inventory_uuid: UUID
    status: str
    # Actually, in this system, we tend to follow human-readable IDs.
    total_qty: int
    available_qty: int
    received_at: datetime
    
    # We might need the item_id in the response for convenience
    inventory_id: Optional[str] = None

    @field_serializer("received_at", "expiration_date")
    def serialize_dates(self, dt: datetime | None) -> str | None:
        if dt is None:
            return None
        return format_datetime(dt)

    class Config:
        from_attributes = True
