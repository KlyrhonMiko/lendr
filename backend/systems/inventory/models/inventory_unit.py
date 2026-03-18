from datetime import datetime
from uuid import UUID
from sqlmodel import Field
from core.base_model import BaseModel
from typing import TYPE_CHECKING
from sqlmodel import Relationship

if TYPE_CHECKING:
    from .borrow_request_unit import BorrowRequestUnit

class InventoryUnit(BaseModel, table=True):
    __tablename__ = "inventory_units"

    unit_id: str = Field(unique=True, index=True, max_length=50)
    inventory_uuid: UUID | None = Field(default=None, foreign_key="inventory.id", index=True)
    
    serial_number: str | None = Field(default=None, unique=True, index=True, max_length=100)
    
    internal_ref: str | None = Field(default=None, unique=True, index=True, max_length=100)
    
    # status: "available", "borrowed", "maintenance", "retired"
    status: str = Field(default="available", max_length=50)

    expiration_date: datetime | None = Field(default=None, index=True, nullable=True)
    
    condition: str | None = Field(default="good", max_length=100)
    description: str | None = Field(default=None, max_length=1000)

    borrow_assignments: list["BorrowRequestUnit"] = Relationship(
        back_populates="inventory_unit",
        sa_relationship_kwargs={"foreign_keys": "[BorrowRequestUnit.unit_uuid]"},
    )
