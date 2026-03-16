from typing import Optional
from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from core.database import get_session
from core.deps import get_current_user
from core.schemas import GenericResponse, PaginationMeta, create_success_response
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
    skip: int = 0,
    limit: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:audit:view")),
):
    """
    Query system-wide activity logs via the AuditService.
    Supports filtering by entity type and specific entity IDs.
    """
    logs, total_count = audit_service.get_logs(
        session, entity_type=entity_type, entity_id=entity_id, skip=skip, limit=limit
    )

    return create_success_response(
        data=logs,
        meta=PaginationMeta(total=total_count, limit=limit, offset=skip),
        message="Audit logs retrieved successfully",
        request=request,
    )
