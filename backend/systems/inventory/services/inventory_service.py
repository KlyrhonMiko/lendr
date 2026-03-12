from sqlmodel import Session
from core.base_service import BaseService
from systems.inventory.models.inventory import InventoryItem
from systems.inventory.schemas.inventory_schemas import InventoryItemCreate, InventoryItemUpdate

class InventoryService(BaseService[InventoryItem, InventoryItemCreate, InventoryItemUpdate]):
    def __init__(self):
        super().__init__(InventoryItem, lookup_field="item_id")

    def create(self, session: Session, schema: InventoryItemCreate) -> InventoryItem:
        self.validate_uniqueness(
            session, 
            schema, 
            unique_fields=[["name", "category"]]
        )

        return super().create(session, schema, prefix="ITEM")
