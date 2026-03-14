from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

class InventoryUnitBase(BaseModel):
    serial_number: Optional[str] = Field(default=None, max_length=100)
    internal_ref: Optional[str] = Field(default=None, max_length=100)
    status: str = Field(default="available", max_length=50)
    condition: Optional[str] = Field(default=None, max_length=100)

class InventoryUnitCreate(InventoryUnitBase):
    inventory_id: str

class InventoryUnitRead(InventoryUnitBase):
    id: UUID
    inventory_id: str

    class Config:
        from_attributes = True
