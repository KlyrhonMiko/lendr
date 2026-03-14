from datetime import datetime
from uuid import UUID
from sqlmodel import Field, Relationship
from core.base_model import BaseModel
from utils.time_utils import get_now_manila

class BorrowRequestEvent(BaseModel, table=True):
    __tablename__ = "borrow_request_events"

    borrow_id: str = Field(foreign_key="borrow_requests.borrow_id", index=True, max_length=50)
    event_type: str = Field(max_length=50)  # e.g., created, approved, released, returned
    actor_id: UUID | None = Field(default=None, foreign_key="users.id")
    actor_employee_id: str | None = Field(default=None, max_length=50)
    note: str | None = Field(default=None, max_length=500)
    occurred_at: datetime = Field(default_factory=get_now_manila)

    borrow_request: "BorrowRequest" = Relationship(back_populates="events")

