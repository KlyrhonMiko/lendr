from datetime import datetime
from uuid import UUID

from sqlmodel import Field

from core.base_model import BaseModel
from utils.time_utils import get_now_manila


class BorrowerSession(BaseModel, table=True):
    __tablename__ = "borrower_sessions"

    session_id: str = Field(unique=True, index=True, max_length=50)

    borrower_uuid: UUID | None = Field(default=None, foreign_key="users.id", index=True)
    
    device_id: str | None = Field(default=None, max_length=100)
    
    issued_at: datetime = Field(default_factory=get_now_manila)
    last_activity_at: datetime | None = Field(default_factory=get_now_manila)
    expires_at: datetime
    is_revoked: bool = Field(default=False)
