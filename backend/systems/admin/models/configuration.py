from sqlmodel import Field

from core.base_model import BaseModel


class SystemSetting(BaseModel, table=True):
    __tablename__ = "system_settings"

    key: str = Field(unique=True, index=True, max_length=100)
    value: str = Field(max_length=255)
    category: str = Field(default="general", max_length=50)
    description: str | None = Field(default=None, max_length=500)