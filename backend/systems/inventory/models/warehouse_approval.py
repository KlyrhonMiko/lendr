from datetime import datetime
from uuid import UUID
from typing import TYPE_CHECKING

from sqlmodel import Field, JSON, Column, Relationship
from core.base_model import BaseModel
from utils.time_utils import get_now_manila

if TYPE_CHECKING:
    from .borrow_request import BorrowRequest


class WarehouseApproval(BaseModel, table=True):
    __tablename__ = "warehouse_approvals"

    approval_id: str = Field(unique=True, index=True, max_length=50)

    request_id: str = Field(unique=True, index=True, max_length=50)
    borrow_uuid: UUID | None = Field(
        default=None, foreign_key="borrow_requests.id", unique=True, index=True
    )

    approved_by: UUID = Field(foreign_key="users.id")
    approved_at: datetime = Field(default_factory=get_now_manila)
    remarks: str | None = Field(default=None, max_length=500)

    printable_payload_json: dict = Field(default_factory=dict, sa_column=Column(JSON))

    borrow_request: "BorrowRequest" = Relationship(
        back_populates="warehouse_approval",
        sa_relationship_kwargs={"foreign_keys": "[WarehouseApproval.borrow_uuid]"},
    )
