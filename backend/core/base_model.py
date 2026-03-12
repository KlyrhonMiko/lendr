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
