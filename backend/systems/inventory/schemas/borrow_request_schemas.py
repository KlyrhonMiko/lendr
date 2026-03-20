from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_serializer, model_validator

from utils.time_utils import format_datetime


class BorrowRequestItemCreate(BaseModel):
    """Schema for a single item in a multi-item borrow request."""

    item_id: str = Field(..., max_length=50)
    qty_requested: int = Field(..., gt=0)


class BorrowRequestItemRead(BaseModel):
    """Schema for reading a single item in a borrow request."""

    item_id: str
    name: str
    qty_requested: int
    classification: Optional[str] = None
    item_type: Optional[str] = None
    is_trackable: bool = False

    @model_validator(mode="before")
    @classmethod
    def resolve_item_details(cls, data):
        if hasattr(data, "inventory_item") and data.inventory_item is not None:
            if hasattr(data, "__dict__"):
                data.__dict__.setdefault("item_id", data.inventory_item.item_id)
                data.__dict__.setdefault("name", data.inventory_item.name)
                data.__dict__.setdefault("classification", data.inventory_item.classification)
                data.__dict__.setdefault("item_type", data.inventory_item.item_type)
                data.__dict__.setdefault("is_trackable", data.inventory_item.is_trackable)
        return data

    class Config:
        from_attributes = True


class BorrowRequestBase(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)


class BorrowRequestCreate(BaseModel):
    items: list[BorrowRequestItemCreate] = Field(..., min_length=1)
    notes: Optional[str] = Field(default=None, max_length=500)
    return_at: Optional[datetime] = None
    involved_people: Optional[list[dict]] = Field(default=None)
    customer_name: Optional[str] = Field(default=None, max_length=255)
    location_name: Optional[str] = Field(default=None, max_length=255)
    is_emergency: bool = False


class BorrowRequestUpdate(BaseModel):
    status: Optional[str] = Field(default=None, max_length=50)


class BorrowRequestEventRead(BaseModel):
    event_id: str
    event_type: str
    actor_user_id: Optional[str] = None
    actor_name: Optional[str] = None
    note: Optional[str] = None
    occurred_at: datetime

    @field_serializer("occurred_at")
    def serialize_date(self, dt: datetime) -> str:
        return format_datetime(dt)

    class Config:
        from_attributes = True


class BorrowRequestEventGlobalRead(BorrowRequestEventRead):
    request_id: str


class BorrowRequestUnitRead(BaseModel):
    borrow_unit_id: str
    unit_id: str
    serial_number: str | None = None
    assigned_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None

    condition_on_return: str | None = None
    return_notes: str | None = None

    @field_serializer("assigned_at", "released_at", "returned_at")
    def serialize_dates(self, dt: datetime | None) -> str | None:
        return format_datetime(dt)

    class Config:
        from_attributes = True


class BorrowRequestBatchRead(BaseModel):
    borrow_batch_id: str
    batch_id: str
    qty_assigned: int
    assigned_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None

    @field_serializer("assigned_at", "released_at", "returned_at")
    def serialize_dates(self, dt: datetime | None) -> str | None:
        return format_datetime(dt)

    class Config:
        from_attributes = True


class WarehouseApprovalRead(BaseModel):
    approval_id: str
    approved_by_user_id: Optional[str] = None
    approved_at: datetime
    remarks: Optional[str] = None

    @field_serializer("approved_at")
    def serialize_date(self, dt: datetime) -> str:
        return format_datetime(dt)

    class Config:
        from_attributes = True


class BorrowRequestRead(BaseModel):
    request_id: str
    transaction_ref: str
    status: str
    request_date: datetime
    borrower_user_id: Optional[str] = None
    request_channel: str = "inventory_manager"
    
    compliance_followup_required: bool = False
    compliance_followup_notes: Optional[str] = None
    
    notes: Optional[str] = None
    customer_name: Optional[str] = None
    location_name: Optional[str] = None
    return_at: Optional[datetime] = None
    
    is_emergency: bool = False
    involved_people: Optional[list[dict]] = None
    approval_channel: str = "standard"
    
    closed_at: Optional[datetime] = None
    closed_by_user_id: Optional[str] = None
    close_reason: Optional[str] = None

    events: list[BorrowRequestEventRead] = []
    items: list[BorrowRequestItemRead] = []
    assigned_units: list[BorrowRequestUnitRead] = []
    assigned_batches: list[BorrowRequestBatchRead] = []
    warehouse_approval: Optional[WarehouseApprovalRead] = None
    returned_on_time: Optional[bool] = None

    @field_serializer("request_date", "return_at", "closed_at")
    def serialize_dates(self, dt: datetime | None) -> str | None:
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
    expiration_date: Optional[datetime] = None
    condition: Optional[str] = Field(default=None, max_length=100)


class BorrowRequestWarehouseApproveWithProvision(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)
    provision_qty: int = Field(default=0, ge=0)
    units: list[WarehouseProvisionUnit] = Field(default_factory=list, max_length=500)
    item_id: Optional[str] = Field(default=None, max_length=50)


class BorrowRequestAutoRouteWarehouse(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)


class BorrowRequestUnitAssign(BaseModel):
    unit_ids: list[str] = Field(min_length=1)
    notes: Optional[str] = Field(default=None, max_length=500)
    item_id: Optional[str] = Field(default=None, max_length=50)


class BorrowRequestBatchAssignment(BaseModel):
    batch_id: str
    qty: int = Field(gt=0)


class BorrowRequestBatchAssign(BaseModel):
    assignments: list[BorrowRequestBatchAssignment] = Field(min_length=1)
    notes: Optional[str] = Field(default=None, max_length=500)
    item_id: str


class BatchItem(BaseModel):
    item_id: str
    qty_requested: int


class BorrowRequestWarehouseReject(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)


class BorrowRequestClose(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)
