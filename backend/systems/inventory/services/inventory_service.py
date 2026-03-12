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
