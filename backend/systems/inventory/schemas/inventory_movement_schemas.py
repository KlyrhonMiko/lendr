from datetime import datetime
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field, field_serializer
from utils.time_utils import format_datetime

class InventoryMovementRead(BaseModel):
    movement_id: str
    inventory_id: str
    actor_user_id: Optional[str] = None
    actor_employee_id: Optional[str] = None
    qty_change: int
    movement_type: str
    reason_code: Optional[str] = None
    reference_id: Optional[str] = None
    note: Optional[str] = None
    occurred_at: datetime

    @field_serializer("occurred_at")
    def serialize_date(self, dt: datetime) -> str:
        return format_datetime(dt)

    class Config:
        from_attributes = True


class InventoryMovementReversalRequest(BaseModel):
    reason_code: str = Field(min_length=1, max_length=50)
    reason: str = Field(min_length=1, max_length=500)


class InventoryMovementReversalRead(BaseModel):
    original_movement_id: str
    reversal_movement_id: str
    inventory_id: str
    original_qty_change: int
    reversal_qty_change: int
    reason: str
    reason_code: str | None = None
    occurred_at: datetime

    @field_serializer("occurred_at")
    def serialize_date(self, dt: datetime) -> str:
        return format_datetime(dt)


class InventoryMovementReconciliationRead(BaseModel):
    inventory_id: str
    movement_count: int
    ledger_balance: int
    actual_balance: int
    delta: int
    is_reconciled: bool
    latest_movement_at: datetime | None = None

    @field_serializer("latest_movement_at")
    def serialize_latest(self, dt: datetime | None) -> str | None:
        if dt is None:
            return None
        return format_datetime(dt)


class InventoryMovementSummaryRead(BaseModel):
    inventory_id: str
    movement_count: int
    total_inflow: int
    total_outflow: int
    net_change: int
    by_type: dict[str, int]
    by_actor_user_id: dict[str, int]
    earliest_movement_at: datetime | None = None
    latest_movement_at: datetime | None = None

    @field_serializer("earliest_movement_at", "latest_movement_at")
    def serialize_dates(self, dt: datetime | None) -> str | None:
        if dt is None:
            return None
        return format_datetime(dt)


class InventoryMovementAnomalyRead(BaseModel):
    anomaly_type: str
    severity: Literal["low", "medium", "high", "critical"]
    inventory_id: str
    message: str
    details: dict[str, Any]
