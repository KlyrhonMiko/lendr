from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlmodel import Session

from core.database import get_session
from core.deps import get_current_user
from core.schemas import GenericResponse, create_success_response, make_pagination_meta
from systems.auth.dependencies import require_permission
from systems.admin.models.user import User
from systems.admin.schemas.audit_log_schemas import AuditLogRead
from systems.admin.services.audit_service import audit_service

router = APIRouter()


@router.get(
    "/logs",
    response_model=GenericResponse[list[AuditLogRead]],
    responses={401: {"model": GenericResponse}},
)
async def list_audit_logs(
    request: Request,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    action: Optional[str] = Query(default=None, description="Filter by action type (created, updated, deleted, approved, etc.)"),
    actor_id: Optional[str] = Query(default=None, description="Filter by actor user ID (e.g. ST-001)"),
    date_from: Optional[datetime] = Query(default=None, description="Filter logs from this datetime (inclusive)"),
    date_to: Optional[datetime] = Query(default=None, description="Filter logs up to this datetime (inclusive)"),
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=50, ge=1, le=500, description="Records per page"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:audit:view")),
):
    """
    Query system-wide activity logs via the AuditService.
    Supports filtering by entity type, entity ID, action, actor, and date range.
    """
    skip = (page - 1) * per_page
    logs, total_count = audit_service.get_logs(
        session,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_user_id=actor_id,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=per_page,
    )

    return create_success_response(
        data=logs,
        meta=make_pagination_meta(total=total_count, skip=skip, limit=per_page, page=page, per_page=per_page),
        message="Audit logs retrieved successfully",
        request=request,
    )
