from sqlalchemy import Index, UniqueConstraint
from sqlmodel import Field

from core.base_model import BaseModel


class SystemSetting(BaseModel, table=True):
    __tablename__ = "system_settings"

    __table_args__ = (
        UniqueConstraint("key", "category", name="uq_system_settings_key_category"),
        Index("ix_system_settings_category", "category"),
    )

    key: str = Field(index=True, max_length=100)
    value: str = Field(max_length=255)
    category: str = Field(default="general", max_length=50)
    description: str | None = Field(default=None, max_length=500)