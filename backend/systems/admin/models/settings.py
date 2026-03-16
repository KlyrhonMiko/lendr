from core.base_model import ConfigurationBase
from sqlalchemy import Index, UniqueConstraint
from sqlmodel import Field

from core.base_model import BaseModel


class AdminConfig(ConfigurationBase, table=True):
    __tablename__ = "admin_configurations"
    
    __table_args__ = (
        UniqueConstraint("key", "category", name="uq_admin_settings_key_category"),
        Index("ix_admin_settings_category", "category"),
    )