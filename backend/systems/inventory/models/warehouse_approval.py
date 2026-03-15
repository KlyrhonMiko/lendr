from datetime import datetime
from uuid import UUID
from sqlmodel import Field, JSON, Column
from core.base_model import BaseModel
from utils.time_utils import get_now_manila

class WarehouseApproval(BaseModel, table=True):
    __tablename__ = "warehouse_approvals"

    approval_id: str = Field(unique=True, index=True, max_length=50)
    borrow_id: str = Field(foreign_key="borrow_requests.borrow_id", unique=True, index=True, max_length=50)
    approved_by: UUID = Field(foreign_key="users.id")
    approved_at: datetime = Field(default_factory=get_now_manila)
    remarks: str | None = Field(default=None, max_length=500)
    
    printable_payload_json: dict = Field(default_factory=dict, sa_column=Column(JSON))
