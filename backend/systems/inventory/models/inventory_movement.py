from datetime import datetime
from sqlmodel import Field
from core.base_model import BaseModel
from utils.time_utils import get_now_manila

class InventoryMovement(BaseModel, table=True):
    __tablename__ = "inventory_movements"

    inventory_id: str = Field(foreign_key="inventory.item_id", index=True, max_length=50)
    
    # How much changed (+5, -2, etc.)
    qty_change: int = Field(..., ge=-10000, le=10000)
    
    # type: "manual_adjustment", "borrow_release", "borrow_return", "procurement"
    movement_type: str = Field(max_length=50)
    
    # Optional link to the transaction (Borrow ID or Request Ref)
    reference_id: str | None = Field(default=None, max_length=50)
    
    note: str | None = Field(default=None, max_length=500)
    occurred_at: datetime = Field(default_factory=get_now_manila)