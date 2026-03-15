from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_serializer
from utils.time_utils import format_datetime

class RequestedItemBase(BaseModel):
    item_name: str = Field(..., max_length=255)
    qty: int = Field(default=1, gt=0)
    justification: Optional[str] = Field(default=None, max_length=500)

class RequestedItemCreate(RequestedItemBase):
    requested_by: Optional[str] = None # Will be set from current_user if not provided

class RequestedItemUpdate(BaseModel):
    status: Optional[str] = Field(default=None, max_length=50)
    qty: Optional[int] = Field(default=None, gt=0)
    justification: Optional[str] = Field(default=None, max_length=500)

class RequestedItemRead(RequestedItemBase):
    request_ref: str
    requested_by: str
    status: str
    created_at: datetime

    @field_serializer("created_at")
    def serialize_date(self, dt: datetime) -> str:
        return format_datetime(dt)

    class Config:
        from_attributes = True
