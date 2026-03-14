from datetime import datetime
from uuid import UUID

from sqlalchemy import Index, text, Column, JSON
from sqlmodel import Field, Relationship
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .borrow_request_event import BorrowRequestEvent
    from .borrow_participant import BorrowParticipant

from core.base_model import BaseModel
from utils.time_utils import get_now_manila


class BorrowRequest(BaseModel, table=True):
    __tablename__ = "borrow_requests"

    borrow_id: str = Field(unique=True, index=True, max_length=50)
    borrower_id: str = Field(foreign_key="users.user_id", index=True, max_length=50)
    item_id: str = Field(foreign_key="inventory.item_id", index=True, max_length=50)
    qty_requested: int
    status: str = Field(default="pending", max_length=50)
    approved_by: UUID | None = Field(default=None, foreign_key="users.id")
    approved_at: datetime | None = Field(default=None)
    released_by: UUID | None = Field(default=None, foreign_key="users.id")
    released_at: datetime | None = Field(default=None)
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

    events: list["BorrowRequestEvent"] = Relationship(back_populates="borrow_request")
    participants: list["BorrowParticipant"] = Relationship(back_populates="borrow_request")

    __table_args__ = (
        Index(
            "ix_active_borrow_request",
            "borrower_id",
            "item_id",
            unique=True,
            postgresql_where=text(
                "status IN ('pending', 'approved', 'released') AND is_deleted IS FALSE"
            ),
        ),
    )
