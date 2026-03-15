from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_serializer

from utils.time_utils import format_datetime


class BorrowRequestBase(BaseModel):
    qty_requested: Optional[int] = Field(default=None, gt=0)
    notes: Optional[str] = Field(default=None, max_length=500)

class BorrowRequestCreate(BorrowRequestBase):
    item_id: str = Field(..., max_length=50)
    borrower_id: Optional[str] = None

    request_channel: str = "inventory_manager" 
    qty_requested: int = Field(..., gt=0)
    due_at: Optional[datetime] = None

    team_name: Optional[str] = None
    involved_people: Optional[list[dict]] = Field(default=None)
    store_name: Optional[str] = None
    location_name: Optional[str] = None

    is_emergency: bool = False
    compliance_followup_required: bool = False
    compliance_followup_notes: Optional[str] = None

class BorrowRequestUpdate(BorrowRequestBase):
    status: Optional[str] = Field(default=None, max_length=50)

class BorrowRequestEventRead(BaseModel):
    event_id: str
    borrow_id: str
    event_type: str
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
    request_channel: str = "inventory_manager"
    compliance_followup_required: bool = False
    compliance_followup_notes: Optional[str] = None
    item_id: str
    due_at: Optional[datetime] = None
    returned_on_time: Optional[bool] = None
    team_name: Optional[str] = None
    store_name: Optional[str] = None
    location_name: Optional[str] = None
    is_emergency: bool = False
    involved_people: Optional[list[dict]] = None
    approval_channel: str = "standard"
    events: list[BorrowRequestEventRead] = []

    @field_serializer("request_date", "due_at")
    def serialize_dates(self, dt: datetime | None) -> str:
        return format_datetime(dt)

class BorrowRequestApprove(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)
    auto_route_shortage: bool = Field(default=True)

class BorrowRequestReject(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)

class BorrowRequestRelease(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)


class BorrowRequestUnitReturn(BaseModel):
    unit_id: str = Field(..., max_length=50)
    condition: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=500)
    status_on_return: Optional[str] = Field(default=None, max_length=50)


class BorrowRequestReturn(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)
    unit_returns: list[BorrowRequestUnitReturn] = Field(default_factory=list)

class BorrowRequestReopen(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)

class BorrowRequestSendToWarehouse(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)

class BorrowRequestWarehouseApprove(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)


class WarehouseProvisionUnit(BaseModel):
    serial_number: Optional[str] = Field(default=None, max_length=100)
    internal_ref: Optional[str] = Field(default=None, max_length=100)
    expiration_date: Optional[datetime] = None
    condition: Optional[str] = Field(default=None, max_length=100)


class BorrowRequestWarehouseApproveWithProvision(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)
    provision_qty: int = Field(default=0, ge=0)
    units: list[WarehouseProvisionUnit] = Field(default_factory=list, max_length=500)


class BorrowRequestAutoRouteWarehouse(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)


class BorrowRequestUnitAssign(BaseModel):
    unit_ids: list[str] = Field(min_length=1)
    notes: Optional[str] = Field(default=None, max_length=500)


class BorrowRequestUnitRead(BaseModel):
    borrow_unit_id: str
    borrow_id: str
    unit_id: str

    requested_at: datetime | None = None
    approved_at: datetime | None = None
    assigned_at: datetime | None = None
    released_at: datetime | None = None
    returned_at: datetime | None = None

    requested_by_user_id: str | None = None
    requested_by_employee_id: str | None = None
    approved_by_user_id: str | None = None
    approved_by_employee_id: str | None = None
    assigned_by_user_id: str | None = None
    assigned_by_employee_id: str | None = None
    released_by_user_id: str | None = None
    released_by_employee_id: str | None = None
    returned_by_user_id: str | None = None
    returned_by_employee_id: str | None = None

    condition_on_return: str | None = None
    return_notes: str | None = None

    @field_serializer("requested_at", "approved_at", "assigned_at", "released_at", "returned_at")
    def serialize_dates(self, dt: datetime | None) -> str | None:
        return format_datetime(dt)

    class Config:
        from_attributes = True

class BatchItem(BaseModel):
    item_id: str
    qty_requested: int

class BorrowRequestBatchCreate(BaseModel):
    borrower_id: str
    items: list[BatchItem]
    notes: Optional[str] = None

    request_channel: str = "inventory_manager"
    compliance_followup_required: bool = False
    compliance_followup_notes: Optional[str] = None

    due_at: Optional[datetime] = None
    team_name: Optional[str] = None
    involved_people: Optional[list[dict]] = Field(default=None)
    store_name: Optional[str] = None
    location_name: Optional[str] = None
    is_emergency: bool = False

