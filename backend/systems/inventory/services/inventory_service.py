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

    def adjust_stock(self, session: Session, item_id: str, quantity: int) -> InventoryItem:
        item = self.get(session, item_id)
        if not item:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Item {item_id} not found")

        new_available = item.available_qty + quantity
        
        if new_available < 0:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for item {item.name}. Available: {item.available_qty}, Requested adjustment: {quantity}"
            )

        item.available_qty = new_available
        session.add(item)
        session.commit()
        session.refresh(item)
        return item

    def get_item_status(self, session: Session, item: InventoryItem) -> str:
        from systems.inventory.services.configuration_service import ConfigurationService
        config_service = ConfigurationService()

        status_settings = config_service.get_by_category(session, "inventory_status")

        if not status_settings:
            # Hardcoded fallback if no statuses have been configured yet
            if item.available_qty <= 0:
                return "OUT_OF_STOCK"
            elif item.available_qty <= 5:
                return "LOW_STOCK"
            else:
                return "HEALTHY"

        # Sort by threshold ascending, return the first status where qty <= threshold
        sorted_statuses = sorted(status_settings, key=lambda s: int(s.value))
        for setting in sorted_statuses:
            if item.available_qty <= int(setting.value):
                return setting.key

        # qty exceeds all defined thresholds — use the last (highest) status
        return sorted_statuses[-1].key
