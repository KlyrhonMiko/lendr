from pydantic import BaseModel, Field


class VisualIdentitySettings(BaseModel):
    brand_name: str = Field(default="Lendr", max_length=100)
    system_theme: str = Field(default="system", pattern="^(light|dark|system)$")
    logo_url: str | None = None
    favicon_url: str | None = None


class BrandingSettingsPayload(BaseModel):
    visual_identity: VisualIdentitySettings
