from datetime import datetime
from uuid import UUID

from sqlalchemy import Text
from sqlmodel import Field

from core.base_model import BaseModel


class UserTwoFactorCredential(BaseModel, table=True):
    __tablename__ = "user_two_factor_credentials"

    user_uuid: UUID = Field(foreign_key="users.id", index=True, unique=True)
    method: str = Field(default="authenticator_app", max_length=32)

    secret_encrypted: str | None = Field(default=None, sa_type=Text)
    pending_secret_encrypted: str | None = Field(default=None, sa_type=Text)

    is_enabled: bool = Field(default=False, index=True)
    enrolled_at: datetime | None = Field(default=None)
    last_verified_at: datetime | None = Field(default=None)
