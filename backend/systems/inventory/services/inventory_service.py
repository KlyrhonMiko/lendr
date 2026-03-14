from sqlmodel import Session, select

from core.base_service import BaseService
from systems.inventory.models.inventory import InventoryItem
from systems.inventory.schemas.inventory_schemas import (
    InventoryItemCreate,
    InventoryItemUpdate,
)
from systems.inventory.models.inventory_movement import InventoryMovement
from systems.inventory.models.inventory_unit import InventoryUnit
from systems.inventory.models.inventory_movement import InventoryMovement

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

    def adjust_stock(
        self, 
        session: Session, 
        item_id: str, 
        qty_change: int, 
        movement_type: str = "manual_adjustment",
        reference_id: str | None = None,
        note: str | None = None
    ) -> InventoryItem:
        db_obj = self.get(session, item_id)
        if not db_obj:
            raise ValueError(f"Item {item_id} not found")

        # Update quantities
        db_obj.available_qty += qty_change
        
        # If adding stock (procurement/return), also update total_qty
        if qty_change > 0:
            db_obj.total_qty += qty_change
        
        # Validation: prevent negative stock
        if db_obj.available_qty < 0:
            raise ValueError(f"Insufficient stock for {item_id}. Available: {db_obj.available_qty - qty_change}")

        # LOG THE MOVEMENT (The Ledger)
        movement = InventoryMovement(
            inventory_id=item_id,
            qty_change=qty_change,
            movement_type=movement_type,
            reference_id=reference_id,
            note=note
        )
        session.add(movement)
        session.add(db_obj)
        # Note: We rely on the caller or the unit of work to commit
        return db_obj


    def get_item_status(self, session: Session, item: InventoryItem) -> str:
        from systems.inventory.services.configuration_service import (
            ConfigurationService,
        )
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

    def get_units(self, session: Session, item_id: str) -> list[InventoryUnit]:
        from systems.inventory.models.inventory_unit import InventoryUnit
        return session.exec(
            select(InventoryUnit).where(InventoryUnit.inventory_id == item_id)
        ).all()
    def get_history(self, session: Session, item_id: str) -> list[InventoryMovement]:
        from systems.inventory.models.inventory_movement import InventoryMovement
        return session.exec(
            select(InventoryMovement)
            .where(InventoryMovement.inventory_id == item_id)
            .order_by(InventoryMovement.occurred_at.desc())
        ).all()