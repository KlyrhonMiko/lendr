from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_serializer
from utils.time_utils import format_datetime

class BorrowRequestBase(BaseModel):
    qty_requested: Optional[int] = Field(default=None, gt=0)
    notes: Optional[str] = Field(default=None, max_length=500)

class BorrowRequestCreate(BorrowRequestBase):
    item_id: str = Field(..., max_length=50)
    borrower_id: str
    qty_requested: int = Field(..., gt=0)

class BorrowRequestUpdate(BorrowRequestBase):
    status: Optional[str] = Field(default=None, max_length=50)

class BorrowRequestRead(BorrowRequestBase):
    borrow_id: str
    status: str
    request_date: datetime
    borrower_id: str
    item_id: str
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    released_by: Optional[UUID] = None
    released_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None

    @field_serializer("request_date", "released_at", "approved_at", "returned_at")
    def serialize_dates(self, dt: datetime) -> str:
        return format_datetime(dt)

    class Config:
        from_attributes = True

