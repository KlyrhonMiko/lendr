from pydantic import BaseModel, Field

class VisualIdentitySettings(BaseModel):
    brand_name: str = Field(default="Lendr", max_length=100)
    system_theme: str = Field(default="system", pattern="^(light|dark|system)$")
    logo_url: str | None = None
    favicon_url: str | None = None

class BannerSettings(BaseModel):
    is_enabled: bool = Field(default=False)
    message: str | None = Field(default=None, max_length=500)
    banner_type: str = Field(default="info", pattern="^(info|warning|error)$")
    expiry_date: str | None = None  # YYYY-MM-DD
    expiry_time: str | None = None  # HH:MM

class BrandingSettingsPayload(BaseModel):
    visual_identity: VisualIdentitySettings
    banner: BannerSettings
