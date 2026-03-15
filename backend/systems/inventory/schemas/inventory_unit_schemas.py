from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class InventoryUnitBase(BaseModel):
    serial_number: Optional[str] = Field(default=None, max_length=100)
    internal_ref: Optional[str] = Field(default=None, max_length=100)
    status: str = Field(default="available", max_length=50)
    expiration_date: Optional[datetime] = None
    condition: Optional[str] = Field(default=None, max_length=100)


class InventoryUnitCreate(InventoryUnitBase):
    """Create a single unit for an inventory item."""
    inventory_id: str


class InventoryUnitBatchCreate(BaseModel):
    """Batch create multiple units for an inventory item."""
    units: list[InventoryUnitBase] = Field(min_items=1, max_items=500)


class InventoryUnitUpdate(BaseModel):
    """Update unit status and/or condition. Only these fields can be modified after creation."""
    status: Optional[str] = Field(default=None, max_length=50)
    expiration_date: Optional[datetime] = None
    condition: Optional[str] = Field(default=None, max_length=100)


class InventoryUnitRead(InventoryUnitBase):
    """Unit read schema with server-assigned fields."""
    unit_id: str
    inventory_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
