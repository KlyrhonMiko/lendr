from datetime import datetime

from sqlmodel import Field

from core.base_model import BaseModel
from utils.time_utils import get_now_manila


class BorrowerSession(BaseModel, table=True):
    __tablename__ = "borrower_sessions"

    borrower_id: str = Field(foreign_key="users.user_id", index=True, max_length=50)
    issued_at: datetime = Field(default_factory=get_now_manila)
    expires_at: datetime
    is_revoked: bool = Field(default=False)