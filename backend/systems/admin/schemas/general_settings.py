from pydantic import BaseModel, Field

class LocalizationSettings(BaseModel):
    timezone: str = Field(default="Asia/Manila")
    date_format: str = Field(default="MM/DD/YYYY")
    time_format: str = Field(default="12h")
    language: str = Field(default="en")

class GeneralSettingsPayload(BaseModel):
    localization: LocalizationSettings
