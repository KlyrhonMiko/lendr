from datetime import datetime
from uuid import UUID

from sqlmodel import Field

from core.base_model import BaseModel


class AuthTwoFactorChallenge(BaseModel, table=True):
    __tablename__ = "auth_two_factor_challenges"

    challenge_id: str = Field(unique=True, index=True, max_length=128)
    user_uuid: UUID = Field(foreign_key="users.id", index=True)

    device_id: str | None = Field(default=None, max_length=100)
    expires_at: datetime

    is_consumed: bool = Field(default=False, index=True)
    consumed_at: datetime | None = Field(default=None)
    failure_count: int = Field(default=0, ge=0)
    used_secondary_password: bool = Field(default=False)
