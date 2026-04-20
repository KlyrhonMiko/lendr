from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlmodel import Field, Relationship

from core.base_model import BaseModel
from utils.time_utils import get_now_manila

if TYPE_CHECKING:
    from systems.admin.models.user import User
    from .inventory_unit import InventoryUnit

class EntrustedItem(BaseModel, table=True):
    __tablename__ = "entrusted_items"

    assignment_id: str = Field(unique=True, index=True, max_length=50)
    unit_uuid: UUID = Field(foreign_key="inventory_units.id", index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)

    assigned_by: UUID | None = Field(default=None, foreign_key="users.id")
    assigned_at: datetime = Field(default_factory=get_now_manila)
    
    returned_by: UUID | None = Field(default=None, foreign_key="users.id")
    returned_at: datetime | None = Field(default=None)
    
    notes: str | None = Field(default=None, max_length=1000)

    # Relationships
    inventory_unit: "InventoryUnit" = Relationship(
        back_populates="entrusted_assignments",
        sa_relationship_kwargs={"foreign_keys": "[EntrustedItem.unit_uuid]"},
    )
    user: "User" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[EntrustedItem.user_id]"}
    )
