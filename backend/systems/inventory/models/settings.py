from sqlalchemy import Index, UniqueConstraint
from core.base_model import ConfigurationBase

class InventoryConfig(ConfigurationBase, table=True):
    __tablename__ = "inventory_configurations"

    __table_args__ = (
        UniqueConstraint("key", "category", name="uq_inventory_config_key_category"),
        Index("ix_inventory_config_category", "category"),
    )


class BorrowerConfig(ConfigurationBase, table=True):
    __tablename__ = "borrower_configurations"
    
    __table_args__ = (
        UniqueConstraint("key", "category", name="uq_borrower_config_key_category"),
        Index("ix_borrower_config_category", "category"),
    )