from typing import Any, Optional
from uuid import UUID
from sqlmodel import Session, select, desc, func
from core.base_service import BaseService
from systems.inventory.models.audit_log import AuditLog
from systems.admin.models.user import User
from systems.inventory.models.inventory import InventoryItem
from systems.inventory.models.borrow_request import BorrowRequest
from systems.inventory.models.inventory_unit import InventoryUnit
from systems.inventory.models.inventory_movement import InventoryMovement

class AuditService(BaseService[AuditLog, Any, Any]):
    def __init__(self):
        super().__init__(AuditLog)

    @staticmethod
    def _uuid_key_to_human_key(key: str) -> str:
        key_map = {
            "borrower_uuid": "borrower_id",
            "item_uuid": "item_id",
            "inventory_uuid": "inventory_id",
            "borrow_uuid": "borrow_id",
            "unit_uuid": "unit_id",
            "user_uuid": "user_id",
            "actor_id": "actor_user_id",
        }
        if key in key_map:
            return key_map[key]
        if key.endswith("_uuid"):
            return f"{key[:-5]}_id"
        return key

    @staticmethod
    def _parse_uuid(value: Any) -> UUID | None:
        if isinstance(value, UUID):
            return value
        if isinstance(value, str):
            try:
                return UUID(value)
            except ValueError:
                return None
        return None

    def _resolve_human_id(
        self,
        session: Session,
        raw_value: Any,
        uuid_cache: dict[UUID, str | None],
    ) -> str | None:
        parsed_uuid = self._parse_uuid(raw_value)
        if parsed_uuid is None:
            if isinstance(raw_value, str):
                return raw_value
            return None

        if parsed_uuid in uuid_cache:
            return uuid_cache[parsed_uuid]

        user = session.exec(select(User).where(User.id == parsed_uuid, User.is_deleted.is_(False))).first()
        if user is not None:
            uuid_cache[parsed_uuid] = user.user_id
            return user.user_id

        item = session.exec(
            select(InventoryItem).where(InventoryItem.id == parsed_uuid, InventoryItem.is_deleted.is_(False))
        ).first()
        if item is not None:
            uuid_cache[parsed_uuid] = item.item_id
            return item.item_id

        borrow = session.exec(
            select(BorrowRequest).where(BorrowRequest.id == parsed_uuid, BorrowRequest.is_deleted.is_(False))
        ).first()
        if borrow is not None:
            uuid_cache[parsed_uuid] = borrow.borrow_id
            return borrow.borrow_id

        unit = session.exec(
            select(InventoryUnit).where(InventoryUnit.id == parsed_uuid, InventoryUnit.is_deleted.is_(False))
        ).first()
        if unit is not None:
            uuid_cache[parsed_uuid] = unit.unit_id
            return unit.unit_id

        movement = session.exec(
            select(InventoryMovement).where(
                InventoryMovement.id == parsed_uuid,
                InventoryMovement.is_deleted.is_(False),
            )
        ).first()
        if movement is not None:
            uuid_cache[parsed_uuid] = movement.movement_id
            return movement.movement_id

        uuid_cache[parsed_uuid] = None
        return None

    def _sanitize_snapshot_payload(
        self,
        session: Session,
        value: Any,
        uuid_cache: dict[UUID, str | None],
    ) -> Any:
        if isinstance(value, dict):
            sanitized_dict: dict[str, Any] = {}
            for key, nested_value in value.items():
                if key == "id" and self._parse_uuid(nested_value) is not None:
                    continue

                new_key = self._uuid_key_to_human_key(key)
                if key.endswith("_uuid") or key in {
                    "actor_id",
                    "approved_by",
                    "released_by",
                    "returned_by",
                    "received_by",
                }:
                    sanitized_value = self._resolve_human_id(session, nested_value, uuid_cache)
                else:
                    sanitized_value = self._sanitize_snapshot_payload(session, nested_value, uuid_cache)

                sanitized_dict[new_key] = sanitized_value
            return sanitized_dict

        if isinstance(value, list):
            return [self._sanitize_snapshot_payload(session, item, uuid_cache) for item in value]

        parsed_uuid = self._parse_uuid(value)
        if parsed_uuid is not None:
            return self._resolve_human_id(session, parsed_uuid, uuid_cache)

        return value

    def log_action(
        self,
        db: Session,
        entity_type: str,
        entity_id: str,
        action: str,
        reason_code: Optional[str] = None,
        actor_id: Optional[UUID] = None,
        actor_user_id: Optional[str] = None,
        actor_employee_id: Optional[str] = None,
        before: Optional[dict[str, Any]] = None,
        after: Optional[dict[str, Any]] = None,
    ) -> AuditLog:
        """Records a change to the audit log."""
        from utils.id_generator import get_next_sequence
        
        audit_id = get_next_sequence(db, self.model, "audit_id", "AUDIT")
        
        log_entry = AuditLog(
            audit_id=audit_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            reason_code=reason_code,
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
            before_json=before,
            after_json=after
        )
        db.add(log_entry)
        return log_entry

    def get_logs(
        self,
        session: Session,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[list[dict[str, Any]], int]:
        """Query system-wide activity logs with optional filters."""
        statement = select(AuditLog).order_by(desc(AuditLog.created_at))
        
        if entity_type:
            statement = statement.where(AuditLog.entity_type == entity_type)
        if entity_id:
            statement = statement.where(AuditLog.entity_id == entity_id)
            
        total_count = session.exec(select(func.count()).select_from(statement.subquery())).one()
        logs = session.exec(statement.offset(skip).limit(limit)).all()

        uuid_cache: dict[UUID, str | None] = {}
        sanitized_logs = [
            {
                "audit_id": log.audit_id,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "action": log.action,
                "reason_code": log.reason_code,
                "before_json": self._sanitize_snapshot_payload(session, log.before_json, uuid_cache),
                "after_json": self._sanitize_snapshot_payload(session, log.after_json, uuid_cache),
                "actor_user_id": log.actor_user_id,
                "actor_employee_id": log.actor_employee_id,
                "created_at": log.created_at,
            }
            for log in logs
        ]

        return sanitized_logs, total_count

audit_service = AuditService()
