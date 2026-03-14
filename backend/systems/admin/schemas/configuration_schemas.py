from typing import Optional

from pydantic import BaseModel, Field


class SystemSettingBase(BaseModel):
    value: str = Field(..., max_length=255)


class SystemSettingCreate(SystemSettingBase):
    key: str = Field(..., max_length=100)
    category: str = Field(default="general", max_length=50)
    description: Optional[str] = None


class SystemSettingUpdate(SystemSettingBase):
    pass


class SystemSettingRead(SystemSettingBase):
    key: str
    category: str
    description: Optional[str] = None

    class Config:
        from_attributes = True