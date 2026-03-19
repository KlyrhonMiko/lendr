from typing import Optional

from pydantic import BaseModel, Field


class InventoryItemBase(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    category: Optional[str] = Field(default=None, max_length=100)

    item_type: Optional[str] = Field(default="equipment", max_length=50)
    classification: Optional[str] = Field(default=None, max_length=100)
    is_trackable: Optional[bool] = Field(default=False)
    description: Optional[str] = Field(default=None, max_length=1000)

class InventoryItemCreate(InventoryItemBase):
    name: str = Field(..., max_length=255)
    category: Optional[str] = Field(default=None, max_length=100)
    condition: Optional[str] = Field(default="good", max_length=100)

class InventoryItemUpdate(InventoryItemBase):
    condition: Optional[str] = Field(default=None, max_length=100)

class InventoryItemRead(InventoryItemBase):
    item_id: str
    total_qty: int
    available_qty: int
    condition: str
    description: Optional[str] = None
    status_condition: Optional[str] = None
    
    class Config:
        from_attributes = True


