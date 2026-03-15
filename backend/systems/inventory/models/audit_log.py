from typing import Optional
from sqlalchemy import Column, JSON
from sqlmodel import Field
from core.base_model import BaseModel
from uuid import UUID

class AuditLog(BaseModel, table=True):
    __tablename__ = "audit_logs"

    audit_id: str = Field(unique=True, index=True, max_length=20)
    entity_type: str = Field(index=True, max_length=50) # "inventory", "borrow", etc.
    entity_id: str = Field(index=True, max_length=50)
    action: str = Field(max_length=50) # "create", "update", "delete", "restore"
    
    before_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    after_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    actor_id: Optional[UUID] = Field(default=None, index=True)
    # Human-readable actor identifiers for readability in logs
    actor_user_id: Optional[str] = Field(default=None, max_length=50)
    actor_employee_id: Optional[str] = Field(default=None, max_length=50)
