from sqlmodel import Field

from core.base_model import BaseModel


class InventoryItem(BaseModel, table=True):
    __tablename__ = "inventory"

    item_id: str = Field(unique=True, index=True, max_length=50)
    name: str = Field(max_length=255)
    category: str = Field(max_length=100)
    total_qty: int = Field(default=0)
    available_qty: int = Field(default=0)
    condition: str = Field(max_length=100)
