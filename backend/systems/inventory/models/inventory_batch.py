from datetime import datetime
from uuid import UUID
from sqlmodel import Field
from core.base_model import BaseModel
from utils.time_utils import get_now_manila

class InventoryBatch(BaseModel, table=True):
    __tablename__ = "inventory_batches"

    batch_id: str = Field(unique=True, index=True, max_length=50)
    inventory_uuid: UUID = Field(foreign_key="inventory.id", index=True)
    
    total_qty: int = Field(default=0, ge=0)
    available_qty: int = Field(default=0, ge=0)
    
    expiration_date: datetime | None = Field(default=None, index=True, nullable=True)
    
    # status: "available", "expired", "recalled", "depleted"
    status: str = Field(default="available", max_length=50)
    description: str | None = Field(default=None, max_length=1000)
    
    received_at: datetime = Field(default_factory=get_now_manila)
