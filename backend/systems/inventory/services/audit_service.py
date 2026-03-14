from typing import Any, Optional
from uuid import UUID
from sqlmodel import Session, select, desc, func
from core.base_service import BaseService
from systems.inventory.models.audit_log import AuditLog

class AuditService(BaseService[AuditLog, Any, Any]):
    def __init__(self):
        super().__init__(AuditLog)

    def log_action(
        self,
        db: Session,
        entity_type: str,
        entity_id: str,
        action: str,
        actor_id: Optional[UUID] = None,
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
            actor_id=actor_id,
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
    ) -> tuple[list[AuditLog], int]:
        """Query system-wide activity logs with optional filters."""
        statement = select(AuditLog).order_by(desc(AuditLog.created_at))
        
        if entity_type:
            statement = statement.where(AuditLog.entity_type == entity_type)
        if entity_id:
            statement = statement.where(AuditLog.entity_id == entity_id)
            
        total_count = session.exec(select(func.count()).select_from(statement.subquery())).one()
        logs = session.exec(statement.offset(skip).limit(limit)).all()
        
        return logs, total_count

audit_service = AuditService()
