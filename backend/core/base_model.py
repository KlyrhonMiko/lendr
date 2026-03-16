from sqlalchemy import Text
from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel

from utils.time_utils import get_now_manila


class BaseModel(SQLModel):

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=get_now_manila, nullable=False)
    updated_at: datetime = Field(default_factory=get_now_manila, nullable=False)
    is_deleted: bool = Field(default=False, nullable=False)
    deleted_at: datetime | None = Field(default=None, nullable=True)

class ConfigurationBase(BaseModel):
    key: str = Field(index=True, max_length=100)
    value: str = Field(sa_type=Text)
    category: str = Field(default="general", max_length=50)
    description: str | None = Field(default=None, max_length=500)