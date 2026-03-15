from datetime import datetime
from collections import Counter
from typing import Any, cast
from uuid import UUID
from systems.admin.models.user import User
from sqlmodel import Session, select
from systems.admin.services.configuration_service import ConfigurationService

from core.base_service import BaseService
from systems.inventory.models.inventory import InventoryItem
from systems.inventory.schemas.inventory_schemas import (
    InventoryItemCreate,
    InventoryItemUpdate,
)
from systems.inventory.models.inventory_movement import InventoryMovement
from systems.inventory.models.inventory_unit import InventoryUnit
from systems.inventory.services.audit_service import audit_service
from utils.id_generator import get_next_sequence
from utils.time_utils import get_now_manila
from systems.inventory.schemas.inventory_movement_schemas import (
    InventoryMovementAnomalyRead,
    InventoryMovementReconciliationRead,
    InventoryMovementSummaryRead,
)


VALID_UNIT_STATUSES = {
    "available",
    "borrowed",
    "maintenance",
    "retired",
    "consumed",
    "expired",
    "discarded",
}

ALLOWED_STATUS_TRANSITIONS = {
    "available": {"borrowed", "maintenance", "retired", "consumed", "expired", "discarded"},
    "borrowed": {"available", "maintenance", "retired", "discarded"},
    "maintenance": {"available", "retired", "discarded"},
    "retired": set(),
    "consumed": set(),
    "expired": {"discarded"},
    "discarded": set(),
}

class InventoryService(BaseService[InventoryItem, InventoryItemCreate, InventoryItemUpdate]):
    def __init__(self):
        super().__init__(InventoryItem, lookup_field="item_id")
        self.config_service = ConfigurationService()

    def _require_config_key(
        self,
        session: Session,
        key: str,
        table_name: str,
        field_name: str,
        field_label: str,
    ) -> None:
        self.config_service.require_table_field_key(
            session,
            key=key,
            table_name=table_name,
            field_name=field_name,
            field_label=field_label,
        )

    def _validate_item_config(self, session: Session, data: dict[str, Any]) -> None:
        if data.get("item_type") is not None:
            self._require_config_key(
                session,
                key=str(data["item_type"]),
                table_name="inventory",
                field_name="item_type",
                field_label="inventory item type",
            )
        if data.get("condition") is not None:
            self._require_config_key(
                session,
                key=str(data["condition"]),
                table_name="inventory",
                field_name="condition",
                field_label="inventory item condition",
            )
        if data.get("category") is not None:
            self._require_config_key(
                session,
                key=str(data["category"]),
                table_name="inventory",
                field_name="category",
                field_label="inventory item category",
            )

    def create(self, session: Session, schema: InventoryItemCreate) -> InventoryItem:
        self.validate_uniqueness(
            session, 
            schema, 
            unique_fields=[["name", "classification", "item_type"]]
        )

        self._validate_item_config(session, schema.model_dump())

        return super().create(session, schema, prefix="ITEM")

    def update(
        self,
        session: Session,
        db_obj: InventoryItem,
        schema: InventoryItemUpdate,
    ) -> InventoryItem:
        obj_data = schema.model_dump(exclude_unset=True)
        self._validate_item_config(session, obj_data)
        return super().update(session, db_obj, schema)

    def adjust_stock(
        self, 
        session: Session, 
        item_id: str, 
        qty_change: int, 
        movement_type: str = "manual_adjustment",
        reference_id: str | None = None,
        reason_code: str | None = None,
        note: str | None = None,
        actor_id: UUID | None = None,
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> InventoryItem:
        self._require_config_key(
            session,
            key=movement_type,
            table_name="inventory_movements",
            field_name="movement_type",
            field_label="inventory movement type",
        )

        if movement_type == "manual_adjustment":
            if not reason_code:
                raise ValueError("reason_code is required for manual stock adjustments")
            if note is None or not note.strip():
                raise ValueError("note is required for manual stock adjustments")
            self._require_config_key(
                session,
                key=reason_code,
                table_name="inventory_movements",
                field_name="reason_code",
                field_label="inventory movement reason code",
            )
        elif reason_code is not None:
            self._require_config_key(
                session,
                key=reason_code,
                table_name="inventory_movements",
                field_name="reason_code",
                field_label="inventory movement reason code",
            )

        db_obj = self.get(session, item_id)
        if not db_obj:
            raise ValueError(f"Item {item_id} not found")

        old_qty = db_obj.available_qty

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
            movement_id=get_next_sequence(session, InventoryMovement, "movement_id", "MOV"),
            inventory_uuid=db_obj.id,
            qty_change=qty_change,
            movement_type=movement_type,
            reason_code=reason_code,
            reference_id=reference_id,
            note=note,
            actor_id=actor_id,
        )

        audit_service.log_action(
            db=session,
            entity_type="inventory",
            entity_id=db_obj.item_id,
            action="stock_adjustment",
            reason_code=reason_code,
            before={"qty": old_qty},
            after={
                "qty": db_obj.available_qty,
                "qty_change": qty_change,
                "movement_type": movement_type,
                "reason_code": reason_code,
                "reference_id": reference_id,
                "note": note,
            },
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )
        session.add(movement)
        session.add(db_obj)
        # Note: We rely on the caller or the unit of work to commit
        return db_obj


    def get_item_status(self, session: Session, item: InventoryItem) -> str:
        from systems.admin.services.configuration_service import (
            ConfigurationService,
        )
        config_service = ConfigurationService()

        status_settings = config_service.get_by_category(
            session,
            config_service.category_for("inventory", "available_qty"),
        )

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
        item = self.get(session, item_id)
        if not item:
            return []
        return session.exec(
            select(InventoryUnit).where(InventoryUnit.inventory_uuid == item.id)
        ).all()

    def get_history(self, session: Session, item_id: str) -> list[InventoryMovement]:
        from systems.inventory.models.inventory_movement import InventoryMovement
        item = self.get(session, item_id)
        if not item:
            return []
        return session.exec(
            select(InventoryMovement)
            .where(InventoryMovement.inventory_uuid == item.id)
            .order_by(InventoryMovement.occurred_at.desc())
        ).all()

    def get_movement(self, session: Session, movement_id: str) -> InventoryMovement | None:
        return session.exec(
            select(InventoryMovement).where(InventoryMovement.movement_id == movement_id)
        ).first()

    def reconcile_movements(self, session: Session, item_id: str) -> InventoryMovementReconciliationRead:
        item = self.get(session, item_id)
        if not item:
            raise ValueError(f"Item {item_id} not found")

        movements = self.get_history(session, item_id)
        ledger_balance = sum(movement.qty_change for movement in movements)
        latest_movement_at = movements[0].occurred_at if movements else None
        delta = ledger_balance - item.available_qty

        return InventoryMovementReconciliationRead(
            movement_count=len(movements),
            ledger_balance=ledger_balance,
            actual_balance=item.available_qty,
            delta=delta,
            is_reconciled=delta == 0,
            latest_movement_at=latest_movement_at,
        )

    def reverse_movement(
        self,
        session: Session,
        movement_id: str,
        reason: str,
        reason_code: str,
        actor_id: UUID | None = None,
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> InventoryMovement:
        original = self.get_movement(session, movement_id)
        if not original:
            raise ValueError(f"Movement {movement_id} not found")
        if original.movement_type == "reversal":
            raise ValueError("Reversal movements cannot be reversed again")

        self._require_config_key(
            session,
            key=reason_code,
            table_name="inventory_movements",
            field_name="reason_code",
            field_label="inventory movement reason code",
        )

        if original.inventory_uuid is None:
            raise ValueError(f"Movement {movement_id} has no inventory_uuid")

        item = session.exec(
            select(InventoryItem).where(
                InventoryItem.id == original.inventory_uuid,
                InventoryItem.is_deleted.is_(False),
            )
        ).first()
        if not item:
            raise ValueError(f"Item for movement {movement_id} not found")

        reversal_qty_change = -original.qty_change
        new_available = item.available_qty + reversal_qty_change
        new_total = item.total_qty

        # Mirror adjust_stock side effects for positive original movements.
        if original.qty_change > 0:
            new_total -= original.qty_change

        if new_available < 0:
            raise ValueError("Reversal would make available quantity negative")
        if new_total < 0:
            raise ValueError("Reversal would make total quantity negative")
        if new_available > new_total:
            raise ValueError("Reversal would make available quantity exceed total quantity")

        reversal = InventoryMovement(
            movement_id=get_next_sequence(session, InventoryMovement, "movement_id", "MOV"),
            inventory_uuid=item.id,
            actor_id=actor_id,
            qty_change=reversal_qty_change,
            movement_type="reversal",
            reason_code=reason_code,
            reference_id=original.movement_id,
            note=reason,
        )

        item.available_qty = new_available
        item.total_qty = new_total

        audit_service.log_action(
            db=session,
            entity_type="inventory_movement",
            entity_id=original.movement_id,
            action="reversed",
            reason_code=reason_code,
            before={
                "movement_id": original.movement_id,
                "inventory_id": item.item_id,
                "qty_change": original.qty_change,
                "movement_type": original.movement_type,
                "reason_code": original.reason_code,
                "reference_id": original.reference_id,
            },
            after={
                "movement_id": reversal.movement_id,
                "inventory_id": item.item_id,
                "qty_change": reversal.qty_change,
                "movement_type": reversal.movement_type,
                "reason_code": reversal.reason_code,
                "reference_id": reversal.reference_id,
                "reason": reason,
            },
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )

        session.add(reversal)
        session.add(item)
        return reversal

    def get_movements_summary(self, session: Session, item_id: str) -> InventoryMovementSummaryRead:
        item = self.get(session, item_id)
        if not item:
            raise ValueError(f"Item {item_id} not found")

        movements = list(
            session.exec(
                select(InventoryMovement)
                .where(InventoryMovement.inventory_uuid == item.id)
                .order_by(InventoryMovement.occurred_at.asc())
            ).all()
        )

        movement_count = len(movements)
        total_inflow = sum(m.qty_change for m in movements if m.qty_change > 0)
        total_outflow = sum(m.qty_change for m in movements if m.qty_change < 0)
        by_type_counter = Counter(m.movement_type for m in movements)
        actor_ids = {m.actor_id for m in movements if m.actor_id is not None}
        actor_map: dict[UUID, str] = {}
        if actor_ids:
            actors = list(
                session.exec(
                    select(User).where(User.id.in_(actor_ids), User.is_deleted.is_(False))
                ).all()
            )
            actor_map = {actor.id: actor.user_id for actor in actors}

        by_actor_counter = Counter(
            actor_map[m.actor_id]
            for m in movements
            if m.actor_id is not None and m.actor_id in actor_map
        )

        return InventoryMovementSummaryRead(
            movement_count=movement_count,
            total_inflow=total_inflow,
            total_outflow=total_outflow,
            net_change=total_inflow + total_outflow,
            by_type=dict(by_type_counter),
            by_actor_user_id=dict(by_actor_counter),
            earliest_movement_at=movements[0].occurred_at if movements else None,
            latest_movement_at=movements[-1].occurred_at if movements else None,
        )

    def get_movement_anomalies(
        self,
        session: Session,
        severity: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[InventoryMovementAnomalyRead]:
        valid_severities = {"low", "medium", "high", "critical"}
        normalized: str | None = None
        if severity is not None:
            normalized = severity.strip().lower()
            if normalized not in valid_severities:
                raise ValueError(
                    f"Invalid severity '{severity}'. Allowed values: {sorted(valid_severities)}"
                )

        items = list(
            session.exec(
                select(InventoryItem).where(InventoryItem.is_deleted.is_(False))
                .offset(skip)
                .limit(limit)
            ).all()
        )
        anomalies: list[InventoryMovementAnomalyRead] = []

        for item in items:
            reconciliation = self.reconcile_movements(session, item.item_id)
            if not reconciliation.is_reconciled:
                level = "high" if abs(reconciliation.delta) >= 5 else "medium"
                anomalies.append(
                    InventoryMovementAnomalyRead(
                        anomaly_type="ledger_mismatch",
                        severity=level,
                        message="Ledger-derived balance does not match item available quantity",
                        details={
                            "ledger_balance": reconciliation.ledger_balance,
                            "actual_balance": reconciliation.actual_balance,
                            "delta": reconciliation.delta,
                            "movement_count": reconciliation.movement_count,
                        },
                    )
                )

            if item.available_qty < 0:
                anomalies.append(
                    InventoryMovementAnomalyRead(
                        anomaly_type="negative_available_qty",
                        severity="critical",
                        message="Item has negative available quantity",
                        details={"available_qty": item.available_qty},
                    )
                )

            if item.available_qty > item.total_qty:
                anomalies.append(
                    InventoryMovementAnomalyRead(
                        anomaly_type="available_exceeds_total",
                        severity="high",
                        message="Item has available quantity greater than total quantity",
                        details={
                            "available_qty": item.available_qty,
                            "total_qty": item.total_qty,
                        },
                    )
                )

        if severity is None:
            return anomalies
        return [a for a in anomalies if a.severity == normalized]

    def get_all_movements(
        self, 
        session: Session, 
        skip: int = 0, 
        limit: int = 100,
        movement_type: str | None = None,
        inventory_id: str | None = None
    ) -> tuple[list[InventoryMovement], int]:
        """Get all inventory movements across all items with optional filtering and pagination."""
        from systems.inventory.models.inventory_movement import InventoryMovement
        from sqlmodel import func
        
        # Build query with filters
        statement = select(InventoryMovement)
        
        if inventory_id:
            item = self.get(session, inventory_id)
            if not item:
                return [], 0
            statement = statement.where(InventoryMovement.inventory_uuid == item.id)
        
        if movement_type:
            statement = statement.where(InventoryMovement.movement_type == movement_type)
        
        # Count total before pagination
        count_statement = select(func.count()).select_from(statement.subquery())
        total_count = session.exec(count_statement).one()
        
        # Get paginated results ordered by most recent first
        results = session.exec(
            statement
            .order_by(InventoryMovement.occurred_at.desc())
            .offset(skip)
            .limit(limit)
        ).all()
        
        return results, total_count

    def _verify_shift_access(self, user: User):
        """Ensures the user is authorized for their current shift."""
        # This is a placeholder for more complex logic later.
        # For now, if user is 'night' shift, prevent 'stock_adjustment' if needed.
        if user.shift_type == "night" and user.role != "admin":
             # We can define specific hours or just blocked roles.
             # For Phase D, let's just implement the structural check.
             pass

    def _is_consumable_item(self, item: InventoryItem) -> bool:
        return item.item_type in {"consumable", "perishable"}

    def _validate_status_transition(self, session: Session, current_status: str, next_status: str) -> None:
        self._require_config_key(
            session,
            key=current_status,
            table_name="inventory_units",
            field_name="status",
            field_label="inventory unit status",
        )
        self._require_config_key(
            session,
            key=next_status,
            table_name="inventory_units",
            field_name="status",
            field_label="inventory unit status",
        )

        if next_status not in VALID_UNIT_STATUSES:
            raise ValueError(f"Invalid status '{next_status}'. Allowed values: {sorted(VALID_UNIT_STATUSES)}")

        if current_status == next_status:
            return

        allowed_targets = ALLOWED_STATUS_TRANSITIONS.get(current_status)
        if allowed_targets is None:
            raise ValueError(f"Current status '{current_status}' is not recognized")

        if next_status not in allowed_targets:
            raise ValueError(f"Invalid status transition: {current_status} -> {next_status}")

    # ===== UNIT MANAGEMENT (Phase 2) =====

    def get_unit(self, session: Session, unit_id: str) -> InventoryUnit | None:
        """Get a single unit by human-readable unit_id."""
        return session.exec(
            select(InventoryUnit).where(InventoryUnit.unit_id == unit_id)
        ).first()

    def _validate_unit_creation(
        self,
        session: Session,
        item_id: str,
        serial_number: str | None,
        internal_ref: str | None,
        expiration_date: datetime | None = None,
    ) -> InventoryItem:
        """
        Validate prerequisites for unit creation:
        - Item exists and is marked as trackable
        - Serial number and internal_ref are unique (if provided)
        """
        item = self.get(session, item_id)
        if not item:
            raise ValueError(f"Inventory item {item_id} not found")
        
        if not item.is_trackable:
            raise ValueError(f"Item {item_id} is not marked as trackable and cannot have units")
        
        # Check for unique serial_number
        if serial_number:
            existing = session.exec(
                select(InventoryUnit).where(InventoryUnit.serial_number == serial_number)
            ).first()
            if existing:
                raise ValueError(f"Serial number '{serial_number}' already exists")
        
        # Check for unique internal_ref
        if internal_ref:
            existing = session.exec(
                select(InventoryUnit).where(InventoryUnit.internal_ref == internal_ref)
            ).first()
            if existing:
                raise ValueError(f"Internal reference '{internal_ref}' already exists")

        if self._is_consumable_item(item) and expiration_date is None:
            raise ValueError(f"Item {item_id} is consumable/perishable and requires expiration_date")

        return item

    def create_unit(
        self,
        session: Session,
        item_id: str,
        serial_number: str | None = None,
        internal_ref: str | None = None,
        expiration_date: datetime | None = None,
        condition: str | None = None,
        actor_id: UUID | None = None,
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> InventoryUnit:
        """
        Create a single unit for a trackable inventory item.
        Validates item exists and is trackable.
        """
        # Validate prerequisites
        item = self._validate_unit_creation(
            session,
            item_id,
            serial_number,
            internal_ref,
            expiration_date,
        )

        # Create unit with default status "available"
        initial_status = "expired" if expiration_date and expiration_date <= get_now_manila() else "available"
        self._require_config_key(
            session,
            key=initial_status,
            table_name="inventory_units",
            field_name="status",
            field_label="inventory unit status",
        )
        if condition is not None:
            self._require_config_key(
                session,
                key=condition,
                table_name="inventory_units",
                field_name="condition",
                field_label="inventory unit condition",
            )

        unit = InventoryUnit(
            unit_id=get_next_sequence(session, InventoryUnit, "unit_id", "UNT"),
            inventory_uuid=item.id,
            serial_number=serial_number,
            internal_ref=internal_ref,
            status=initial_status,
            expiration_date=expiration_date,
            condition=condition,
        )

        if self._is_consumable_item(item) and unit.status == "borrowed":
            raise ValueError("Consumable/perishable units cannot be set to borrowed")

        # Log audit event for unit creation
        audit_service.log_action(
            db=session,
            entity_type="inventory_unit",
            entity_id=unit.unit_id,
            action="created",
            before={},
            after={
                "unit_id": unit.unit_id,
                "serial_number": serial_number,
                "internal_ref": internal_ref,
                "status": unit.status,
                "expiration_date": expiration_date.isoformat() if expiration_date else None,
            },
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )

        session.add(unit)
        return unit

    def create_units_batch(
        self,
        session: Session,
        item_id: str,
        units_data: list[dict],
        actor_id: UUID | None = None,
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> list[InventoryUnit]:
        """
        Create multiple units for a trackable inventory item in a single transaction.
        Each unit is validated independently but all operations commit atomically.
        """
        item = self.get(session, item_id)
        if not item:
            raise ValueError(f"Inventory item {item_id} not found")
        
        if not item.is_trackable:
            raise ValueError(f"Item {item_id} is not marked as trackable and cannot have units")

        created_units = []
        serial_numbers_in_batch = set()
        internal_refs_in_batch = set()

        for unit_data in units_data:
            serial_number = unit_data.get("serial_number")
            internal_ref = unit_data.get("internal_ref")
            condition = unit_data.get("condition")
            expiration_date = unit_data.get("expiration_date")

            # Check uniqueness within batch
            if serial_number:
                if serial_number in serial_numbers_in_batch:
                    raise ValueError(f"Duplicate serial_number in batch: '{serial_number}'")
                serial_numbers_in_batch.add(serial_number)

            if internal_ref:
                if internal_ref in internal_refs_in_batch:
                    raise ValueError(f"Duplicate internal_ref in batch: '{internal_ref}'")
                internal_refs_in_batch.add(internal_ref)

            # Validate against database (uniqueness)
            item = self._validate_unit_creation(
                session,
                item_id,
                serial_number,
                internal_ref,
                expiration_date,
            )

            if isinstance(expiration_date, str):
                expiration_date = datetime.fromisoformat(expiration_date)

            initial_status = "expired" if expiration_date and expiration_date <= get_now_manila() else "available"
            self._require_config_key(
                session,
                key=initial_status,
                table_name="inventory_units",
                field_name="status",
                field_label="inventory unit status",
            )
            if condition is not None:
                self._require_config_key(
                    session,
                    key=condition,
                    table_name="inventory_units",
                    field_name="condition",
                    field_label="inventory unit condition",
                )

            # Create unit
            unit = InventoryUnit(
                unit_id=get_next_sequence(session, InventoryUnit, "unit_id", "UNT"),
                inventory_uuid=item.id,
                serial_number=serial_number,
                internal_ref=internal_ref,
                status=initial_status,
                expiration_date=expiration_date,
                condition=condition,
            )

            if self._is_consumable_item(item) and unit.status == "borrowed":
                raise ValueError("Consumable/perishable units cannot be set to borrowed")

            # Log audit event for each unit
            audit_service.log_action(
                db=session,
                entity_type="inventory_unit",
                entity_id=unit.unit_id,
                action="created",
                before={},
                after={
                    "unit_id": unit.unit_id,
                    "serial_number": serial_number,
                    "internal_ref": internal_ref,
                    "status": unit.status,
                    "expiration_date": expiration_date.isoformat() if expiration_date else None,
                },
                actor_id=actor_id,
                actor_user_id=actor_user_id,
                actor_employee_id=actor_employee_id,
            )

            session.add(unit)
            created_units.append(unit)

        return created_units

    def update_unit(
        self,
        session: Session,
        unit_id: str,
        status: str | None = None,
        expiration_date: datetime | None = None,
        condition: str | None = None,
        actor_id: UUID | None = None,
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> InventoryUnit:
        """
        Update unit status and/or condition.
        Serial number and internal_ref are immutable after creation.
        """
        unit = self.get_unit(session, unit_id)
        if not unit:
            raise ValueError(f"Unit {unit_id} not found")

        before_state = {
            "status": unit.status,
            "expiration_date": unit.expiration_date.isoformat() if unit.expiration_date else None,
            "condition": unit.condition,
        }

        # Update only if provided
        if status is not None:
            self._validate_status_transition(session, unit.status, status)
            unit.status = status

        if expiration_date is not None:
            unit.expiration_date = expiration_date

        if unit.expiration_date and unit.expiration_date <= get_now_manila() and unit.status in {"available", "borrowed"}:
            self._require_config_key(
                session,
                key="expired",
                table_name="inventory_units",
                field_name="status",
                field_label="inventory unit status",
            )
            unit.status = "expired"

        item = None
        if unit.inventory_uuid is not None:
            item = session.exec(
                select(InventoryItem).where(
                    InventoryItem.id == unit.inventory_uuid,
                    InventoryItem.is_deleted.is_(False),
                )
            ).first()
        if item and self._is_consumable_item(item) and unit.status == "borrowed":
            raise ValueError("Consumable/perishable units cannot use 'borrowed' status")

        if condition is not None:
            self._require_config_key(
                session,
                key=condition,
                table_name="inventory_units",
                field_name="condition",
                field_label="inventory unit condition",
            )
            unit.condition = condition

        after_state = {
            "status": unit.status,
            "expiration_date": unit.expiration_date.isoformat() if unit.expiration_date else None,
            "condition": unit.condition,
        }

        # Log audit event
        audit_service.log_action(
            db=session,
            entity_type="inventory_unit",
            entity_id=unit.unit_id,
            action="updated",
            before=before_state,
            after=after_state,
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )

        session.add(unit)
        return unit

    def retire_unit(
        self,
        session: Session,
        unit_id: str,
        actor_id: UUID | None = None,
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> InventoryUnit:
        """
        Retire (soft delete) a unit by setting its status to 'retired'.
        Once retired, a unit cannot be borrowed or used.
        """
        unit = self.get_unit(session, unit_id)
        if not unit:
            raise ValueError(f"Unit {unit_id} not found")

        if unit.status == "retired":
            raise ValueError(f"Unit {unit_id} is already retired")

        before_state = {
            "status": unit.status,
            "condition": unit.condition,
        }

        self._require_config_key(
            session,
            key="retired",
            table_name="inventory_units",
            field_name="status",
            field_label="inventory unit status",
        )

        unit.status = "retired"

        after_state = {
            "status": unit.status,
            "condition": unit.condition,
        }

        # Log audit event
        audit_service.log_action(
            db=session,
            entity_type="inventory_unit",
            entity_id=unit.unit_id,
            action="retired",
            before=before_state,
            after=after_state,
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )

        session.add(unit)
        return unit

    def get_units_by_status(
        self,
        session: Session,
        item_id: str,
        status: str | None = None,
        expiring_before: datetime | None = None,
        include_expired: bool = True,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[InventoryUnit], int]:
        """Get units for an item, optionally filtered by status, with pagination."""
        from sqlmodel import func

        item = self.get(session, item_id)
        if not item:
            return [], 0

        statement = select(InventoryUnit).where(InventoryUnit.inventory_uuid == item.id)

        if status:
            self._require_config_key(
                session,
                key=status,
                table_name="inventory_units",
                field_name="status",
                field_label="inventory unit status",
            )
            statement = statement.where(InventoryUnit.status == status)

        if expiring_before:
            expiration_field = cast(Any, InventoryUnit.expiration_date)
            statement = statement.where(expiration_field <= expiring_before)

        if not include_expired:
            self._require_config_key(
                session,
                key="expired",
                table_name="inventory_units",
                field_name="status",
                field_label="inventory unit status",
            )
            statement = statement.where(InventoryUnit.status != "expired")

        # Count total
        count_statement = select(func.count()).select_from(statement.subquery())
        total_count = session.exec(count_statement).one()

        # Get paginated results
        results = session.exec(
            statement
            .offset(skip)
            .limit(limit)
        ).all()

        return list(results), total_count