from datetime import datetime
from uuid import UUID

from sqlalchemy import Index, text, Column, JSON
from sqlmodel import Field, Relationship
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from .borrow_request_event import BorrowRequestEvent
    from .borrow_participant import BorrowParticipant
    from .borrow_request_unit import BorrowRequestUnit
    from .warehouse_approval import WarehouseApproval

from core.base_model import BaseModel
from utils.time_utils import get_now_manila


class BorrowRequest(BaseModel, table=True):
    __tablename__ = "borrow_requests"

    borrow_id: str = Field(unique=True, index=True, max_length=50)
    borrower_uuid: UUID | None = Field(default=None, foreign_key="users.id", index=True)
    item_uuid: UUID | None = Field(default=None, foreign_key="inventory.id", index=True)
    qty_requested: int
    status: str = Field(default="pending", max_length=50)
    approved_by: UUID | None = Field(default=None, foreign_key="users.id")
    approved_at: datetime | None = Field(default=None)
    released_by: UUID | None = Field(default=None, foreign_key="users.id")
    released_at: datetime | None = Field(default=None)
    returned_by: UUID | None = Field(default=None, foreign_key="users.id")
    received_by: UUID | None = Field(default=None, foreign_key="users.id")
    returned_at: datetime | None = Field(default=None)
    request_date: datetime = Field(default_factory=get_now_manila)
    notes: str | None = Field(default=None, max_length=500)

    transaction_ref: str = Field(unique=True, index=True, max_length=50)
    due_at: datetime | None = Field(default=None)
    returned_on_time: bool | None = Field(default=None)
    release_employee_id: str | None = Field(default=None, max_length=50)
    team_name: str | None = Field(default=None, max_length=100)
    store_name: str | None = Field(default=None, max_length=100)
    location_name: str | None = Field(default=None, max_length=100)

    is_emergency: bool = Field(default=False)
    approval_channel: str = Field(default="standard", max_length=50)

    involved_people: list[dict] | None = Field(default=None, sa_column=Column(JSON))

    request_channel: str = Field(default="inventory_manager", max_length=50)
    compliance_followup_required: bool = Field(default=False)
    compliance_followup_notes: str | None = Field(default=None, max_length=500)

    events: list["BorrowRequestEvent"] = Relationship(
        back_populates="borrow_request",
        sa_relationship_kwargs={"foreign_keys": "[BorrowRequestEvent.borrow_uuid]"},
    )
    participants: list["BorrowParticipant"] = Relationship(
        back_populates="borrow_request",
        sa_relationship_kwargs={"foreign_keys": "[BorrowParticipant.borrow_uuid]"},
    )
    assigned_units: list["BorrowRequestUnit"] = Relationship(
        back_populates="borrow_request",
        sa_relationship_kwargs={"foreign_keys": "[BorrowRequestUnit.borrow_uuid]"},
    )
    warehouse_approval: Optional["WarehouseApproval"] = Relationship(
        back_populates="borrow_request",
        sa_relationship_kwargs={
            "uselist": False,
            "foreign_keys": "[WarehouseApproval.borrow_uuid]",
        },
    )

    __table_args__ = (
        Index(
            "ix_active_borrow_request_uuid",
            "borrower_uuid",
            "item_uuid",
            unique=True,
            postgresql_where=text(
                "status IN ('pending', 'approved', 'released') AND is_deleted IS FALSE"
            ),
        ),
    )
