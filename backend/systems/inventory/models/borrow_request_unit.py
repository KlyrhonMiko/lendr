from datetime import datetime
from uuid import UUID

from sqlmodel import Field, Relationship

from core.base_model import BaseModel
from utils.time_utils import get_now_manila


class BorrowRequestUnit(BaseModel, table=True):
    __tablename__ = "borrow_request_units"

    borrow_unit_id: str = Field(unique=True, index=True, max_length=50)
    borrow_id: str = Field(foreign_key="borrow_requests.borrow_id", index=True, max_length=50)
    unit_id: str = Field(foreign_key="inventory_units.unit_id", index=True, max_length=50)

    requested_at: datetime | None = Field(default=None)
    approved_at: datetime | None = Field(default=None)
    assigned_at: datetime | None = Field(default_factory=get_now_manila)
    released_at: datetime | None = Field(default=None)
    returned_at: datetime | None = Field(default=None)

    requested_by: UUID | None = Field(default=None, foreign_key="users.id")
    requested_by_user_id: str | None = Field(default=None, index=True, max_length=50)
    requested_by_employee_id: str | None = Field(default=None, index=True, max_length=50)

    approved_by: UUID | None = Field(default=None, foreign_key="users.id")
    approved_by_user_id: str | None = Field(default=None, index=True, max_length=50)
    approved_by_employee_id: str | None = Field(default=None, index=True, max_length=50)

    assigned_by: UUID | None = Field(default=None, foreign_key="users.id")
    assigned_by_user_id: str | None = Field(default=None, index=True, max_length=50)
    assigned_by_employee_id: str | None = Field(default=None, index=True, max_length=50)

    released_by: UUID | None = Field(default=None, foreign_key="users.id")
    released_by_user_id: str | None = Field(default=None, index=True, max_length=50)
    released_by_employee_id: str | None = Field(default=None, index=True, max_length=50)

    returned_by: UUID | None = Field(default=None, foreign_key="users.id")
    returned_by_user_id: str | None = Field(default=None, index=True, max_length=50)
    returned_by_employee_id: str | None = Field(default=None, index=True, max_length=50)

    condition_on_return: str | None = Field(default=None, max_length=100)
    return_notes: str | None = Field(default=None, max_length=500)

    borrow_request: "BorrowRequest" = Relationship(back_populates="assigned_units")
    inventory_unit: "InventoryUnit" = Relationship(back_populates="borrow_assignments")