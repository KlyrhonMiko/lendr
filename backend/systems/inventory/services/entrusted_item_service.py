from sqlmodel import Session, select, func
from typing import Optional
from uuid import UUID
from core.base_service import BaseService

from systems.admin.models.user import User
from systems.inventory.models.inventory_unit import InventoryUnit
from systems.inventory.models.inventory import InventoryItem
from systems.inventory.models.entrusted_item import EntrustedItem

from systems.inventory.schemas.entrusted_item_schemas import (
    EntrustedItemCreate,
    EntrustedItemRead,
    EntrustedItemRevoke,
)
from systems.admin.services.user_service import UserService
from systems.inventory.services.inventory_service import InventoryService
from utils.id_generator import get_next_sequence
from utils.time_utils import get_now_manila
from systems.admin.services.audit_service import audit_service


class EntrustedItemService(
    BaseService[EntrustedItem, EntrustedItemCreate, EntrustedItemRevoke]
):
    def __init__(self):
        super().__init__(EntrustedItem, lookup_field="assignment_id")
        self.user_service = UserService()
        self.inventory_service = InventoryService()

    def _ensure_movement_types(self, session: Session):
        """Ensure necessary movement types exist in configuration."""
        from systems.inventory.models.settings import InventoryConfig
        
        types = {
            "entrusted_assign": ("Entrusted Assignment", "Unit assigned to an employee permanently"),
            "entrusted_revoke": ("Entrusted Revoke", "Unit returned from entrusted assignment")
        }
        
        category = "inventory_movements_movement_type"
        for key, (label, desc) in types.items():
            existing = session.exec(
                select(InventoryConfig).where(
                    InventoryConfig.category == category,
                    InventoryConfig.key == key
                )
            ).first()
            
            if existing:
                if existing.is_deleted:
                    existing.is_deleted = False
                    existing.deleted_at = None
                    session.add(existing)
                    session.flush()
            else:
                config = InventoryConfig(
                    system="inventory",
                    key=key,
                    value=label,
                    category=category,
                    description=desc,
                    crucial=True
                )
                session.add(config)
                session.flush() # Ensure it's available for the next steps in the same transaction

    def assign_item(
        self,
        session: Session,
        create_data: EntrustedItemCreate,
        actor_id: UUID
    ) -> EntrustedItemRead:
        # Ensure required configuration exists
        self._ensure_movement_types(session)

        unit = self.inventory_service.get_unit(session, create_data.unit_id)
        if not unit:
            raise ValueError(f"Inventory unit '{create_data.unit_id}' not found.")
        if unit.status != "available":
            raise ValueError(f"Inventory unit '{create_data.unit_id}' is not 'available' (current status: {unit.status}).")

        user = self.user_service.get(session, create_data.user_id)
        if not user:
            raise ValueError(f"User '{create_data.user_id}' not found.")

        item = session.exec(select(InventoryItem).where(InventoryItem.id == unit.inventory_uuid)).first()
        if not item:
            raise ValueError(f"Parent inventory item not found for unit '{unit.unit_id}'.")

        # Check if already entrusted or something
        if unit.entrusted_assignments:
            # Check for active ones
            active = [a for a in unit.entrusted_assignments if a.returned_at is None]
            if active:
                raise ValueError("Unit is already entrusted to someone else.")

        now = get_now_manila()
        assignment_id = get_next_sequence(session, EntrustedItem, "assignment_id", "ENT")
        
        # 1. Update unit status FIRST so that get_item_balances sees the change
        unit.status = "entrusted"
        session.add(unit)
        session.flush()

        # 2. Adjust stock (this will trigger alerts based on the new status)
        self.inventory_service.adjust_stock(
            session,
            item.item_id,
            -1,
            movement_type="entrusted_assign",
            reference_id=assignment_id,
            reference_type="entrusted_item",
            actor_id=actor_id,
            unit_uuid=unit.id,
        )

        assignment = EntrustedItem(
            assignment_id=assignment_id,
            unit_uuid=unit.id,
            user_id=user.id,
            assigned_by=actor_id,
            assigned_at=now,
            notes=create_data.notes
        )
        session.add(assignment)
        
        # Sync the reference ID in the movement (ledger)
        # Note: adjust_stock created an InventoryMovement, but we don't have its ID easily without querying.
        # But for entrusted, the reference_id should be the assignment_id.
        # Let's just use the assignment_id for both.

        audit_service.log_action(
            db=session,
            entity_type="entrusted_item",
            entity_id=assignment.assignment_id,
            action="assign",
            actor_id=actor_id,
            after={
                "unit_id": unit.unit_id,
                "user_id": user.user_id,
                "notes": create_data.notes
            }
        )

        session.commit()
        session.refresh(assignment)
        
        return self._serialize(session, assignment, unit, user, item)

    def revoke_item(
        self,
        session: Session,
        assignment_id: str,
        revoke_data: EntrustedItemRevoke,
        actor_id: UUID
    ) -> EntrustedItemRead:
        # Ensure required configuration exists
        self._ensure_movement_types(session)

        assignment = self.get(session, assignment_id)
        if not assignment:
            raise ValueError(f"Assignment '{assignment_id}' not found.")
            
        if assignment.returned_at is not None:
            raise ValueError(f"Assignment '{assignment_id}' is already revoked/returned.")
            
        unit = session.exec(select(InventoryUnit).where(InventoryUnit.id == assignment.unit_uuid)).first()
        user = session.exec(select(User).where(User.id == assignment.user_id)).first()
        item = session.exec(select(InventoryItem).where(InventoryItem.id == unit.inventory_uuid)).first() if unit else None

        now = get_now_manila()
        assignment.returned_by = actor_id
        assignment.returned_at = now
        
        if revoke_data.notes and revoke_data.notes.strip():
            note_content = revoke_data.notes.strip()
            if assignment.notes:
                assignment.notes += f"\nRevoke Notes: {note_content}"
            else:
                assignment.notes = f"Revoke Notes: {note_content}"

        if unit:
            if item:
                # 1. Update unit status FIRST so that get_item_balances sees the change
                unit.status = "available"
                session.add(unit)
                session.flush()

                # 2. Adjust stock (this will trigger alerts based on the new status)
                self.inventory_service.adjust_stock(
                    session,
                    item.item_id,
                    1,
                    movement_type="entrusted_revoke",
                    reference_id=assignment_id,
                    reference_type="entrusted_item",
                    actor_id=actor_id,
                    unit_uuid=unit.id,
                )

        session.add(assignment)

        audit_service.log_action(
            db=session,
            entity_type="entrusted_item",
            entity_id=assignment.assignment_id,
            action="revoke",
            actor_id=actor_id,
            after={
                "notes": revoke_data.notes
            }
        )
        
        session.commit()
        session.refresh(assignment)

        return self._serialize(session, assignment, unit, user, item)

    def get_all_entrusted(
        self, 
        session: Session, 
        skip: int = 0, 
        limit: int = 100, 
        search: Optional[str] = None,
        status: Optional[str] = None,
        category: Optional[str] = None,
        classification: Optional[str] = None
    ) -> tuple[list[EntrustedItemRead], int]:
        from sqlmodel import or_
        
        # Build base statement for querying assignments
        statement = select(EntrustedItem)
        
        # Determine if we need joins (search always needs them, category needs them, status might not but we'll apply them if needed)
        needs_joins = search is not None or category is not None or classification is not None
        
        if needs_joins:
            statement = (
                statement
                .join(InventoryUnit, EntrustedItem.unit_uuid == InventoryUnit.id, isouter=True)
                .join(User, EntrustedItem.user_id == User.id, isouter=True)
                .join(InventoryItem, InventoryUnit.inventory_uuid == InventoryItem.id, isouter=True)
            )
            
        if search:
            search_pattern = f"%{search}%"
            statement = statement.where(
                or_(
                    EntrustedItem.assignment_id.ilike(search_pattern),
                    InventoryUnit.unit_id.ilike(search_pattern),
                    InventoryUnit.serial_number.ilike(search_pattern),
                    User.first_name.ilike(search_pattern),
                    User.last_name.ilike(search_pattern),
                    InventoryItem.name.ilike(search_pattern),
                    InventoryItem.category.ilike(search_pattern),
                    InventoryItem.classification.ilike(search_pattern)
                )
            )
            
        if status:
            if status == "active":
                statement = statement.where(EntrustedItem.returned_at.is_(None))
            elif status == "returned":
                statement = statement.where(EntrustedItem.returned_at.is_not(None))
                
        if category:
            if not needs_joins:
                 statement = statement.join(InventoryUnit, EntrustedItem.unit_uuid == InventoryUnit.id, isouter=True).join(InventoryItem, InventoryUnit.inventory_uuid == InventoryItem.id, isouter=True)
            statement = statement.where(InventoryItem.category.ilike(category))
            
        if classification:
            if not needs_joins:
                 statement = statement.join(InventoryUnit, EntrustedItem.unit_uuid == InventoryUnit.id, isouter=True).join(InventoryItem, InventoryUnit.inventory_uuid == InventoryItem.id, isouter=True)
            statement = statement.where(InventoryItem.classification.ilike(classification))
            
        # Get total count with filters applied
        count_statement = select(func.count(EntrustedItem.id))
        if needs_joins:
            count_statement = (
                count_statement
                .join(InventoryUnit, EntrustedItem.unit_uuid == InventoryUnit.id, isouter=True)
                .join(User, EntrustedItem.user_id == User.id, isouter=True)
                .join(InventoryItem, InventoryUnit.inventory_uuid == InventoryItem.id, isouter=True)
            )
        elif category is not None or classification is not None:
             count_statement = count_statement.join(InventoryUnit, EntrustedItem.unit_uuid == InventoryUnit.id, isouter=True).join(InventoryItem, InventoryUnit.inventory_uuid == InventoryItem.id, isouter=True)
        
        if search:
            count_statement = count_statement.where(
                or_(
                    EntrustedItem.assignment_id.ilike(search_pattern),
                    InventoryUnit.unit_id.ilike(search_pattern),
                    InventoryUnit.serial_number.ilike(search_pattern),
                    User.first_name.ilike(search_pattern),
                    User.last_name.ilike(search_pattern),
                    InventoryItem.name.ilike(search_pattern),
                    InventoryItem.category.ilike(search_pattern),
                    InventoryItem.classification.ilike(search_pattern)
                )
            )
            
        if status:
            if status == "active":
                count_statement = count_statement.where(EntrustedItem.returned_at.is_(None))
            elif status == "returned":
                count_statement = count_statement.where(EntrustedItem.returned_at.is_not(None))
                
        if category:
            count_statement = count_statement.where(InventoryItem.category.ilike(category))
            
        if classification:
            count_statement = count_statement.where(InventoryItem.classification.ilike(classification))
        
        total = session.exec(count_statement).one()
        
        # Apply ordering, offset, and limit
        statement = statement.order_by(EntrustedItem.assigned_at.desc()).offset(skip).limit(limit)
        assignments = session.exec(statement).all()
        
        results = []
        for ass in assignments:
            unit = session.exec(select(InventoryUnit).where(InventoryUnit.id == ass.unit_uuid)).first()
            user = session.exec(select(User).where(User.id == ass.user_id)).first()
            item = session.exec(select(InventoryItem).where(InventoryItem.id == unit.inventory_uuid)).first() if unit else None
            results.append(self._serialize(session, ass, unit, user, item))
            
        return results, total

    def get_entrusted_categories(self, session: Session) -> dict[str, list[str]]:
        # Get distinct classifications and categories that actually exist
        classifications = session.exec(select(InventoryItem.classification).distinct()).all()
        categories = session.exec(select(InventoryItem.category).distinct()).all()
        
        return {
            "categories": sorted([c for c in categories if c]),
            "classifications": sorted([c for c in classifications if c])
        }

    def get_for_user(self, session: Session, user_id: str) -> list[EntrustedItemRead]:
        user = self.user_service.get(session, user_id)
        if not user:
            return []

        assignments = session.exec(
            select(EntrustedItem)
            .where(EntrustedItem.user_id == user.id)
            .order_by(EntrustedItem.assigned_at.desc())
        ).all()

        results = []
        for ass in assignments:
            unit = session.exec(select(InventoryUnit).where(InventoryUnit.id == ass.unit_uuid)).first()
            item = session.exec(select(InventoryItem).where(InventoryItem.id == unit.inventory_uuid)).first() if unit else None
            results.append(self._serialize(session, ass, unit, user, item))
            
        return results

    def _serialize(
        self,
        session: Session,
        assignment: EntrustedItem,
        unit: InventoryUnit | None,
        user: User | None,
        item: InventoryItem | None
    ) -> EntrustedItemRead:
        
        assigned_by_user = session.exec(select(User).where(User.id == assignment.assigned_by)).first() if assignment.assigned_by else None
        returned_by_user = session.exec(select(User).where(User.id == assignment.returned_by)).first() if assignment.returned_by else None

        payload = assignment.model_dump(mode="json")
        payload["unit_id"] = unit.unit_id if unit else "UNKNOWN"
        payload["serial_number"] = unit.serial_number if unit else None
        payload["item_name"] = item.name if item else None
        payload["item_category"] = item.classification if item else None
        payload["assigned_to_user_id"] = user.user_id if user else "UNKNOWN"
        payload["assigned_to_name"] = user.full_name if user else "Unknown User"
        payload["assigned_by_user_id"] = assigned_by_user.user_id if assigned_by_user else None
        payload["returned_by_user_id"] = returned_by_user.user_id if returned_by_user else None

        return EntrustedItemRead.model_validate(payload)
