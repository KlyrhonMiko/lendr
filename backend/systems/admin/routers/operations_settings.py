from fastapi import APIRouter, Depends, Request, BackgroundTasks
from sqlmodel import Session, select
from core.database import get_session
from core.deps import get_current_user
from systems.auth.dependencies import require_permission, reusable_oauth2
from core.schemas import GenericResponse, create_success_response
from systems.admin.models.user import User
from systems.admin.schemas.operations_settings import (
    OperationsSettingsPayload,
    MaintenanceModeSettings,
    BackupScheduleSettings,
    ArchivePolicySettings,
    RetentionPolicySettings
)
from systems.admin.models.settings import AdminConfig as Configuration
from systems.admin.services.scheduler_service import scheduler_service
from systems.auth.services.auth_service import auth_service
from core.config import settings
from jose import jwt
from utils.time_utils import get_now_manila
import json

router = APIRouter()

@router.get("/", response_model=GenericResponse[OperationsSettingsPayload])
async def get_operations_settings(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    """Fetch current system operations configurations."""
    category = "operations_settings"
    statement = select(Configuration).where(Configuration.category == category)
    settings = session.exec(statement).all()
    
    settings_dict = {s.key: s.value for s in settings}

    # Helper for booleans
    def is_true(val): return val.lower() == "true"
    
    payload = OperationsSettingsPayload(
        maintenance=MaintenanceModeSettings(
            enabled=is_true(settings_dict.get("maintenance_enabled", "false")),
            message=settings_dict.get("maintenance_message", "The system is currently undergoing scheduled maintenance. Please check back later."),
        ),
        backup_schedule=BackupScheduleSettings(
            frequency=settings_dict.get("backup_frequency", "daily"),
            time=settings_dict.get("backup_time", "02:00"),
            storage_location=settings_dict.get("backup_storage", "local"),
        ),
        archive_policy=ArchivePolicySettings(
            audit_logs_value=int(settings_dict.get("archive_audit_value", "90")),
            audit_logs_unit=settings_dict.get("archive_audit_unit", "d"),
            borrow_records_value=int(settings_dict.get("archive_borrow_value", "1")),
            borrow_records_unit=settings_dict.get("archive_borrow_unit", "y"),
        ),
        retention_policy=RetentionPolicySettings(
            auto_delete=is_true(settings_dict.get("retention_auto_delete", "true")),
            delete_older_than_value=int(settings_dict.get("retention_value", "7")),
            delete_older_than_unit=settings_dict.get("retention_unit", "y"),
            exclusion_list=json.loads(settings_dict.get("retention_exclusion", '["Financial Audit", "Asset History", "Legal Holds"]')),
            maintenance_time=settings_dict.get("maintenance_schedule_time", "03:00"),
        )
    )

    return create_success_response(
        data=payload,
        message="Operations settings retrieved successfully",
        request=request
    )

@router.put("/", response_model=GenericResponse[OperationsSettingsPayload])
async def update_operations_settings(
    payload: OperationsSettingsPayload,
    request: Request,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    token: str = Depends(reusable_oauth2),
    _: None = Depends(require_permission("admin:config:manage")),
):
    """Update system operations configurations."""
    category = "operations_settings"
    
    def upsert_setting(key: str, value: str):
        existing = session.exec(
            select(Configuration).where(
                Configuration.key == key, 
                Configuration.category == category
            )
        ).first()

        if existing:
            existing.value = value
            existing.updated_at = get_now_manila()
            session.add(existing)
        else:
            new_config = Configuration(
                system="admin",
                key=key,
                value=value,
                category=category,
                description=f"System Operations setting: {key}",
                created_at=get_now_manila(),
                updated_at=get_now_manila()
            )
            session.add(new_config)

    # 1. Maintenance trigger detection
    old_maintenance = session.exec(
        select(Configuration).where(
            Configuration.key == "maintenance_enabled", 
            Configuration.category == category
        )
    ).first()
    was_enabled = old_maintenance.value.lower() == "true" if old_maintenance else False
    now_enabled = payload.maintenance.enabled

    # 1. Maintenance configuration
    upsert_setting("maintenance_enabled", str(now_enabled).lower())
    upsert_setting("maintenance_message", payload.maintenance.message)

    # 2. Backup
    upsert_setting("backup_enabled", "true") # If they hit save, we assume they want backups enabled if set
    upsert_setting("backup_frequency", payload.backup_schedule.frequency)
    upsert_setting("backup_time", payload.backup_schedule.time)
    upsert_setting("backup_storage", payload.backup_schedule.storage_location)

    # 3. Archive
    upsert_setting("archive_audit_value", str(payload.archive_policy.audit_logs_value))
    upsert_setting("archive_audit_unit", payload.archive_policy.audit_logs_unit)
    upsert_setting("archive_borrow_value", str(payload.archive_policy.borrow_records_value))
    upsert_setting("archive_borrow_unit", payload.archive_policy.borrow_records_unit)

    # 4. Retention
    upsert_setting("retention_auto_delete", str(payload.retention_policy.auto_delete).lower())
    upsert_setting("retention_value", str(payload.retention_policy.delete_older_than_value))
    upsert_setting("retention_unit", payload.retention_policy.delete_older_than_unit)
    upsert_setting("retention_exclusion", json.dumps(payload.retention_policy.exclusion_list))
    upsert_setting("maintenance_schedule_time", payload.retention_policy.maintenance_time)

    session.commit()
    
    # Trigger maintenance cycle and session revocation immediately if mode was just ENABLED
    if now_enabled and not was_enabled:
        # Extract session_id to exclude it from revocation
        try:
            decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            current_session_id = decoded.get("session_id")
        except Exception:
            current_session_id = None
            
        # Run heavy maintenance tasks in background to keep UI responsive
        background_tasks.add_task(auth_service.revoke_all_other_sessions, session, current_session_id)
        background_tasks.add_task(scheduler_service._run_ops_maintenance_job)
    
    # Trigger scheduler re-sync for any time changes
    scheduler_service.sync_schedule()
    
    return create_success_response(
        message="Operations settings synchronized successfully",
        data=payload,
        request=request
    )
