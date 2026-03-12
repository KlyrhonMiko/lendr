from typing import Optional
from pydantic import BaseModel, Field

class InventoryItemBase(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    category: Optional[str] = Field(default=None, max_length=100)
    total_qty: Optional[int] = Field(default=None, ge=0)
    available_qty: Optional[int] = Field(default=None, ge=0)
    condition: Optional[str] = Field(default=None, max_length=100)

class InventoryItemCreate(InventoryItemBase):
    name: str = Field(..., max_length=255)
    category: str = Field(..., max_length=100)
    total_qty: int = Field(..., ge=0)
    available_qty: int = Field(..., ge=0)
    condition: str = Field(..., max_length=100)

class InventoryItemUpdate(InventoryItemBase):
    pass # Everything in Base is already Optional

class InventoryItemRead(InventoryItemBase):
    item_id: str
    class Config:
        from_attributes = True
