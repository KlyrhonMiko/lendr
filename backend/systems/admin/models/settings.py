from core.base_model import ConfigurationBase
from sqlalchemy import Index, UniqueConstraint
from sqlmodel import Field


class AdminConfig(ConfigurationBase, table=True):
    __tablename__ = "admin_configurations"
    
    system: str = Field(default="admin", index=True, max_length=50)
    
    __table_args__ = (
        UniqueConstraint("key", "category", name="uq_admin_settings_key_category"),
        Index("ix_admin_settings_category", "category"),
    )