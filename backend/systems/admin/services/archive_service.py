import logging
from uuid import UUID
from sqlmodel import Session, select
from core.database import engine
from core.models.audit_log import AuditLog
from systems.inventory.models.borrow_request import BorrowRequest
from systems.admin.services.configuration_service import ConfigurationService
from utils.time_utils import get_now_manila
from utils.logging import log_operation

logger = logging.getLogger("app")

class ArchiveService:
    def __init__(self):
        self.config_service = ConfigurationService()

    def run_archive_cycle(self, actor_id: UUID | None = None):
        """
        Identify records that have passed the 'Archive audit logs/borrow records older than' 
        threshold and mark them as archived.
        """
        with Session(engine) as session:
            try:
                category = "operations_settings"
                
                # 1. Archive Audit Logs
                audit_val = int(self.config_service.get_value(session, "archive_audit_value", "90", category=category))
                audit_unit = self.config_service.get_value(session, "archive_audit_unit", "d", category=category)
                
                # 2. Archive Borrow Records
                borrow_val = int(self.config_service.get_value(session, "archive_borrow_value", "1", category=category))
                borrow_unit = self.config_service.get_value(session, "archive_borrow_unit", "y", category=category)

                now = get_now_manila()
                
                # Process Audit Logs
                self._archive_entities(session, AuditLog, audit_val, audit_unit, now, actor_id)
                
                # Process Borrow Requests
                self._archive_entities(session, BorrowRequest, borrow_val, borrow_unit, now, actor_id)

                session.commit()
                log_operation("ARCHIVE-CYCLE-DONE", "Completed system archival cycle")
            except Exception as e:
                session.rollback()
                logger.error(f"Archival cycle failed: {str(e)}")
                log_operation("ARCHIVE-CYCLE-FAIL", f"Archival cycle failed: {str(e)}", level="ERROR")

    def run_purge_cycle(self, actor_id: UUID | None = None):
        """
        Identify archived records that have passed the 'Auto-delete records older than' 
        threshold and permanently delete them, respecting the exclusion list.
        """
        with Session(engine) as session:
            try:
                category = "operations_settings"
                auto_delete = self.config_service.get_value(session, "retention_auto_delete", "true", category=category).lower() == "true"
                
                if not auto_delete:
                    log_operation("PURGE-DISABLED", "Data retention auto-delete is disabled")
                    return

                purge_val = int(self.config_service.get_value(session, "retention_value", "7", category=category))
                purge_unit = self.config_service.get_value(session, "retention_unit", "y", category=category)
                exclusion_list = self.config_service.get_value(session, "retention_exclusion", "[]", category=category)
                import json
                exclusions = json.loads(exclusion_list)

                now = get_now_manila()
                
                # Purge Audit Logs
                self._purge_entities(session, AuditLog, purge_val, purge_unit, now, exclusions, actor_id)
                
                # Purge Borrow Requests
                self._purge_entities(session, BorrowRequest, purge_val, purge_unit, now, exclusions, actor_id)

                session.commit()
                log_operation("PURGE-CYCLE-DONE", "Completed system data retention purge cycle")
            except Exception as e:
                session.rollback()
                logger.error(f"Purge cycle failed: {str(e)}")
                log_operation("PURGE-CYCLE-FAIL", f"Purge cycle failed: {str(e)}", level="ERROR")

    def _archive_entities(self, session, model, val, unit, now, actor_id):
        from datetime import timedelta
        
        if unit == "d":
            cutoff = now - timedelta(days=val)
        elif unit == "m":
            cutoff = now - timedelta(days=val * 30)
        elif unit == "y":
            cutoff = now - timedelta(days=val * 365)
        else:
            cutoff = now - timedelta(days=val)
        
        statement = select(model).where(
            model.created_at < cutoff,
            model.is_archived.is_(False)
        )
        records = session.exec(statement).all()
        
        archived_count = 0
        for record in records:
            record.is_archived = True
            record.archived_at = now
            session.add(record)
            archived_count += 1
            
        if archived_count > 0:
            log_operation("ARCHIVE-MOVE", f"Moved {archived_count} {model.__tablename__} records to archives")

    def _purge_entities(self, session, model, val, unit, now, exclusions, actor_id):
        from datetime import timedelta
        
        if unit == "d":
            cutoff = now - timedelta(days=val)
        elif unit == "m":
            cutoff = now - timedelta(days=val * 30)
        elif unit == "y":
            cutoff = now - timedelta(days=val * 365)
        else:
            cutoff = now - timedelta(days=val)
        
        # We only purge records that are already archived
        statement = select(model).where(
            model.created_at < cutoff,
            model.is_archived.is_(True)
        )
        records = session.exec(statement).all()
        
        purged_count = 0
        for record in records:
            # Check for exclusions
            is_excluded = False
            if record.retention_tags and any(tag in exclusions for tag in record.retention_tags):
                is_excluded = True
            
            if not is_excluded:
                session.delete(record)
                purged_count += 1
        
        if purged_count > 0:
            log_operation("PURGE-DELETE", f"Permanently deleted {purged_count} {model.__tablename__} records")

archive_service = ArchiveService()
