from sqlmodel import Field
from core.base_model import BaseModel

class InventoryUnit(BaseModel, table=True):
    __tablename__ = "inventory_units"

    inventory_id: str = Field(foreign_key="inventory.item_id", index=True, max_length=50)
    
    serial_number: str | None = Field(default=None, unique=True, index=True, max_length=100)
    
    internal_ref: str | None = Field(default=None, unique=True, index=True, max_length=100)
    
    # status: "available", "borrowed", "maintenance", "retired"
    status: str = Field(default="available", max_length=50)
    
    condition: str | None = Field(default=None, max_length=100)
