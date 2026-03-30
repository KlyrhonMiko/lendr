from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlmodel import Session

from core.database import get_session
from core.deps import get_current_user
from core.schemas import GenericResponse, create_success_response, make_pagination_meta
from systems.auth.dependencies import require_permission
from systems.admin.models.user import User
from systems.admin.services.audit_service import audit_service
from systems.admin.schemas.audit_log_schemas import AuditLogRead
from systems.inventory.services.borrow_request_service import borrow_request_service
from systems.inventory.schemas.borrow_request_schemas import BorrowRequestRead
from pydantic import BaseModel

class UpdateTagsRequest(BaseModel):
    tags: list[str]

router = APIRouter()

@router.get("/audit-logs", response_model=GenericResponse[list[AuditLogRead]])
async def get_archived_audit_logs(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    """Fetch archived audit logs."""
    skip = (page - 1) * per_page
    logs, total = audit_service.get_logs(
        session=session,
        skip=skip,
        limit=per_page,
        is_archived=True
    )
    
    return create_success_response(
        data=logs,
        meta=make_pagination_meta(total=total, skip=skip, limit=per_page, page=page, per_page=per_page),
        message="Archived audit logs retrieved successfully",
        request=request
    )

@router.get("/borrow-requests", response_model=GenericResponse[list[BorrowRequestRead]])
async def get_archived_borrow_requests(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    """Fetch archived borrow requests."""
    skip = (page - 1) * per_page
    archived_requests, total = borrow_request_service.get_all(
        session=session,
        skip=skip,
        limit=per_page,
        is_archived=True
    )
    
    return create_success_response(
        data=archived_requests,
        meta=make_pagination_meta(total=total, skip=skip, limit=per_page, page=page, per_page=per_page),
        message="Archived borrow requests retrieved successfully",
        request=request
    )

@router.post("/{entity_type}/{id}/restore", response_model=GenericResponse)
async def restore_archived_record(
    entity_type: str,
    id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    """Restore a record from the archives."""
    if entity_type == "audit-log":
        obj = audit_service.get(session, id, include_archived=True)
        if not obj:
            raise HTTPException(status_code=404, detail="Audit log not found")
        audit_service.restore_archive(session, obj, actor_id=current_user.id)
    elif entity_type == "borrow-request":
        # Note: borrow_request uses a human-readable ID or UUID. 
        # BaseService handles the lookup_field.
        obj = borrow_request_service.get(session, id, include_archived=True)
        if not obj:
            raise HTTPException(status_code=404, detail="Borrow request not found")
        borrow_request_service.restore_archive(session, obj, actor_id=current_user.id)
    else:
        raise HTTPException(status_code=400, detail="Invalid entity type")
        
    return create_success_response(
        data=None,
        message=f"Successfully restored {entity_type} from archives",
        request=request
    )

@router.patch("/{entity_type}/{id}/tags", response_model=GenericResponse)
async def update_retention_tags(
    entity_type: str,
    id: str,
    data: UpdateTagsRequest,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    """Update retention tags (Exclusion List) for a specific record."""
    service = None
    if entity_type == "audit-log":
        service = audit_service
    elif entity_type == "borrow-request":
        service = borrow_request_service
        
    if not service:
        raise HTTPException(status_code=400, detail="Invalid entity type")
        
    obj = service.get(session, id, include_archived=True)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{entity_type} not found")
        
    obj.retention_tags = data.tags
    session.add(obj)
    session.commit()
    
    return create_success_response(
        data=obj, 
        message="Retention tags updated successfully",
        request=request
    )
