from sqlalchemy import Index, UniqueConstraint
from core.base_model import ConfigurationBase

class AuthConfig(ConfigurationBase, table=True):
    __tablename__ = "auth_configurations"

    __table_args__ = (
        UniqueConstraint("key", "category", name="uq_auth_config_key_category"),
        Index("ix_auth_config_category", "category"),
    )
