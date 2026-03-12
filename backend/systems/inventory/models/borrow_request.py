from datetime import datetime
from uuid import UUID
from sqlmodel import Field
from core.base_model import BaseModel
from sqlalchemy import Index, text
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

    __table_args__ = (
        Index(
            "ix_active_borrow_request",
            "borrower_id",
            "item_id",
            unique=True,
            postgresql_where=text("status IN ('pending', 'approved', 'released') AND is_deleted IS FALSE"),
        ),
    )

