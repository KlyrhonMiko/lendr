from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, field_serializer, field_validator

from utils.time_utils import format_datetime


class BorrowRequestItemCreate(BaseModel):
    """Schema for a single item in a multi-item borrow request."""

    item_id: str = Field(..., max_length=50)
    qty_requested: int = Field(..., gt=0)


class BorrowRequestItemRead(BaseModel):
    """Schema for reading a single item in a borrow request."""

    item_id: str
    qty_requested: int

    class Config:
        from_attributes = True


class BorrowRequestBase(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)


class BorrowRequestCreate(BaseModel):
    """Schema for creating a borrow request. Supports both single and multi-item."""

    borrower_id: Optional[str] = None

    # Single-item fields (for backward compatibility)
    item_id: Optional[str] = Field(default=None, max_length=50)
    qty_requested: Optional[int] = Field(default=None, gt=0)

    # Multi-item field
    items: Optional[List[BorrowRequestItemCreate]] = Field(default=None, min_length=1)

    # Common fields
    notes: Optional[str] = Field(default=None, max_length=500)
    request_channel: str = "inventory_manager"
    due_at: Optional[datetime] = None

    team_name: Optional[str] = None
    involved_people: Optional[List[dict]] = Field(default=None)
    store_name: Optional[str] = None
    location_name: Optional[str] = None

    is_emergency: bool = False
    compliance_followup_required: bool = False
    compliance_followup_notes: Optional[str] = None

    @field_validator("items", mode="before")
    @classmethod
    def validate_items_or_single(cls, v, info):
        """Ensure either items OR (item_id + qty_requested) is provided, not both."""
        data = info.data
        has_items = v is not None and len(v) > 0
        has_single = (
            data.get("item_id") is not None and data.get("qty_requested") is not None
        )

        if has_items and has_single:
            raise ValueError(
                "Cannot specify both 'items' and 'item_id'/'qty_requested'"
            )
        if not has_items and not has_single:
            raise ValueError(
                "Must specify either 'items' (multi-item) or 'item_id'+'qty_requested' (single-item)"
            )

        return v


class BorrowRequestUpdate(BaseModel):
    status: Optional[str] = Field(default=None, max_length=50)


class BorrowRequestEventRead(BaseModel):
    event_id: str
    event_type: str
    actor_user_id: Optional[str] = None
    note: Optional[str] = None
    occurred_at: datetime

    @field_serializer("occurred_at")
    def serialize_date(self, dt: datetime) -> str:
        return format_datetime(dt)

    class Config:
        from_attributes = True


class BorrowRequestRead(BaseModel):
    borrow_id: str
    transaction_ref: str
    status: str
    request_date: datetime
    borrower_user_id: Optional[str] = None
    request_channel: str = "inventory_manager"
    compliance_followup_required: bool = False
    compliance_followup_notes: Optional[str] = None
    notes: Optional[str] = None

    # For backward compatibility: single-item fields (will be set from first item if multi-item)
    item_id: Optional[str] = None
    qty_requested: Optional[int] = None

    # Multi-item fields
    items: List[BorrowRequestItemRead] = []

    due_at: Optional[datetime] = None
    returned_on_time: Optional[bool] = None
    team_name: Optional[str] = None
    store_name: Optional[str] = None
    location_name: Optional[str] = None
    is_emergency: bool = False
    involved_people: Optional[List[dict]] = None
    approval_channel: str = "standard"
    events: List["BorrowRequestEventRead"] = []

    @field_serializer("request_date", "due_at")
    def serialize_dates(self, dt: datetime | None) -> str | None:
        return format_datetime(dt)

    class Config:
        from_attributes = True


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
    unit_returns: List[BorrowRequestUnitReturn] = Field(default_factory=List)


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
    units: List[WarehouseProvisionUnit] = Field(default_factory=List, max_length=500)


class BorrowRequestAutoRouteWarehouse(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)


class BorrowRequestUnitAssign(BaseModel):
    unit_ids: List[str] = Field(min_length=1)
    notes: Optional[str] = Field(default=None, max_length=500)


class BorrowRequestUnitRead(BaseModel):
    borrow_unit_id: str
    unit_id: str | None = None

    requested_at: datetime | None = None
    approved_at: datetime | None = None
    assigned_at: datetime | None = None
    released_at: datetime | None = None
    returned_at: datetime | None = None

    condition_on_return: str | None = None
    return_notes: str | None = None

    @field_serializer(
        "requested_at", "approved_at", "assigned_at", "released_at", "returned_at"
    )
    def serialize_dates(self, dt: datetime | None) -> str | None:
        return format_datetime(dt)

    class Config:
        from_attributes = True


class BatchItem(BaseModel):
    item_id: str
    qty_requested: int


class BorrowRequestBatchCreate(BaseModel):
    borrower_id: str
    items: List[BatchItem]
    notes: Optional[str] = None

    request_channel: str = "inventory_manager"
    compliance_followup_required: bool = False
    compliance_followup_notes: Optional[str] = None

    due_at: Optional[datetime] = None
    team_name: Optional[str] = None
    involved_people: Optional[List[dict]] = Field(default=None)
    store_name: Optional[str] = None
    location_name: Optional[str] = None
    is_emergency: bool = False
