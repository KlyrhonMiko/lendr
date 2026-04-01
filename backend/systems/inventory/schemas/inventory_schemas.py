from typing import Optional

from pydantic import BaseModel, Field


class InventoryItemBase(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    category: Optional[str] = Field(default=None, max_length=100)

    item_type: Optional[str] = Field(default="equipment", max_length=50)
    classification: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)

class InventoryItemCreate(InventoryItemBase):
    name: str = Field(..., max_length=255)
    category: Optional[str] = Field(default=None, max_length=100)
    condition: Optional[str] = Field(default="good", max_length=100)
    is_trackable: bool = Field(default=False)

class InventoryItemUpdate(InventoryItemBase):
    condition: Optional[str] = Field(default=None, max_length=100)

class InventoryItemRead(InventoryItemBase):
    item_id: str
    total_qty: int
    available_qty: int
    condition: str
    status: str
    is_trackable: bool
    description: Optional[str] = None
    status_condition: Optional[str] = None
    
    class Config:
        from_attributes = True


class InventoryCatalogItemRead(BaseModel):
    item_id: str
    name: str
    category: Optional[str] = None
    total_qty: int
    available_qty: int
    condition: str
    item_type: Optional[str] = None
    classification: Optional[str] = None
    description: Optional[str] = None
    status_condition: Optional[str] = None

    class Config:
        from_attributes = True


