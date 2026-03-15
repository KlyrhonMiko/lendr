from uuid import UUID
from datetime import datetime
from sqlmodel import Field
from core.base_model import BaseModel
from utils.time_utils import get_now_manila

class InventoryMovement(BaseModel, table=True):
    __tablename__ = "inventory_movements"

    movement_id: str = Field(unique=True, index=True, max_length=50)
    inventory_id: str = Field(foreign_key="inventory.item_id", index=True, max_length=50)
    
    actor_id: UUID | None = Field(
        default=None, 
        foreign_key="users.id", # Link to the UUID primary key
        index=True
    )
    # Human-readable actor identifiers for readability in logs
    actor_user_id: str | None = Field(default=None, max_length=50)
    actor_employee_id: str | None = Field(default=None, max_length=50)
    
    # How much changed (+5, -2, etc.)
    qty_change: int = Field(..., ge=-10000, le=10000)
    
    # type: "manual_adjustment", "borrow_release", "borrow_return", "procurement"
    movement_type: str = Field(max_length=50)

    reason_code: str | None = Field(default=None, index=True, max_length=50)
    
    # Optional link to the transaction (Borrow ID or Request Ref)
    reference_id: str | None = Field(default=None, max_length=50)
    
    note: str | None = Field(default=None, max_length=500)
    occurred_at: datetime = Field(default_factory=get_now_manila)