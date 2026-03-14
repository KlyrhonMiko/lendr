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
    borrower_id: Optional[str] = None
    qty_requested: int = Field(..., gt=0)
    due_at: Optional[datetime] = None
    team_name: Optional[str] = None
    store_name: Optional[str] = None
    location_name: Optional[str] = None
    is_emergency: bool = False

class BorrowRequestUpdate(BorrowRequestBase):
    status: Optional[str] = Field(default=None, max_length=50)

class BorrowRequestEventRead(BaseModel):
    id: UUID
    borrow_id: str
    event_type: str
    actor_id: Optional[UUID] = None
    actor_employee_id: Optional[str] = None
    note: Optional[str] = None
    occurred_at: datetime

    @field_serializer("occurred_at")
    def serialize_date(self, dt: datetime) -> str:
        return format_datetime(dt)

    class Config:
        from_attributes = True

class BorrowRequestRead(BorrowRequestBase):
    borrow_id: str
    transaction_ref: str
    status: str
    request_date: datetime
    borrower_id: str
    item_id: str
    due_at: Optional[datetime] = None
    returned_on_time: Optional[bool] = None
    team_name: Optional[str] = None
    store_name: Optional[str] = None
    location_name: Optional[str] = None
    is_emergency: bool = False
    approval_channel: str = "standard"
    events: list[BorrowRequestEventRead] = []

    @field_serializer("request_date", "due_at")
    def serialize_dates(self, dt: datetime) -> str:
        return format_datetime(dt)

class BorrowRequestApprove(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)

class BorrowRequestRelease(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)

class BorrowRequestReturn(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)

class BatchItem(BaseModel):
    item_id: str
    qty_requested: int

class BorrowRequestBatchCreate(BaseModel):
    borrower_id: str
    items: list[BatchItem]
    notes: Optional[str] = None

    due_at: Optional[datetime] = None
    team_name: Optional[str] = None
    store_name: Optional[str] = None
    location_name: Optional[str] = None
    is_emergency: bool = False

