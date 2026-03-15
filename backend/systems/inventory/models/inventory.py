from sqlalchemy import Index, text
from sqlmodel import Field
from core.base_model import BaseModel

class InventoryItem(BaseModel, table=True):
    __tablename__ = "inventory"

    item_id: str = Field(unique=True, index=True, max_length=50)
    name: str = Field(max_length=255)
    category: str = Field(max_length=100)
    total_qty: int = Field(default=0, ge=0)
    available_qty: int = Field(default=0, ge=0) 
    condition: str = Field(max_length=100)

    item_type: str = Field(default="equipment", max_length=50)
    classification: str | None = Field(default=None, max_length=100)
    is_trackable: bool = Field(default=False)

    __table_args__ = (
        Index(
            "ix_inventory_item_name_active",
            "name",
            "classification",
            "item_type",
            unique=True,
            postgresql_where=text("is_deleted IS FALSE"),
        ),
    )
