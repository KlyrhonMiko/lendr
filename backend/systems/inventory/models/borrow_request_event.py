from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID
from sqlmodel import Field, Relationship
from core.base_model import BaseModel
from utils.time_utils import get_now_manila

if TYPE_CHECKING:
    from systems.inventory.models.borrow_request import BorrowRequest

class BorrowRequestEvent(BaseModel, table=True):
    __tablename__ = "borrow_request_events"

    event_id: str = Field(unique=True, index=True, max_length=50)
    borrow_uuid: UUID | None = Field(default=None, foreign_key="borrow_requests.id", index=True)

    event_type: str = Field(max_length=50)  # e.g., created, approved, released, returned
    note: str | None = Field(default=None, max_length=500)
    occurred_at: datetime = Field(default_factory=get_now_manila)

    actor_id: UUID | None = Field(default=None, foreign_key="users.id")

    borrow_request: "BorrowRequest" = Relationship(
        back_populates="events",
        sa_relationship_kwargs={"foreign_keys": "[BorrowRequestEvent.borrow_uuid]"},
    )

