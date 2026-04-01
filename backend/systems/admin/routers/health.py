from fastapi import APIRouter, Depends, Request, HTTPException, Query
from sqlmodel import Session
from typing import List

from core.database import get_session
from core.deps import get_current_user
from core.schemas import GenericResponse, create_success_response, make_pagination_meta
from systems.admin.models.user import User
from systems.auth.dependencies import require_permission
from systems.admin.services.health_service import SystemHealthService
from systems.admin.schemas.health import (
    SystemStatusRead,
    StorageInfoRead,
    ActiveSessionRead,
    LogEntryRead
)

router = APIRouter()
health_service = SystemHealthService()

@router.get("/status", response_model=GenericResponse[SystemStatusRead])
async def get_system_status(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:health:view")),
):
    status = health_service.get_system_status(session)
    return create_success_response(data=status, request=request)

@router.get("/storage", response_model=GenericResponse[StorageInfoRead])
async def get_storage_info(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:health:view")),
):
    storage = health_service.get_storage_info(session)
    return create_success_response(data=storage, request=request)

@router.get("/sessions", response_model=GenericResponse[List[ActiveSessionRead]])
async def get_active_sessions(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    _: None = Depends(require_permission("admin:health:view")),
):
    sessions = health_service.get_active_sessions(session, skip, limit)
    return create_success_response(data=sessions, request=request)

@router.delete("/sessions/{session_id}")
async def terminate_session(
    session_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:health:manage")),
):
    success = health_service.terminate_session(session, session_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")

    session.commit()
    
    return create_success_response(
        data=None,
        message=f"Session {session_id} terminated successfully", 
        request=request
    )

@router.get("/logs", response_model=GenericResponse[List[LogEntryRead]])
async def get_recent_logs(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(5, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:health:view")),
):
    skip = (page - 1) * per_page
    logs, total = health_service.get_recent_logs(skip, per_page)
    
    meta = make_pagination_meta(total=total, skip=skip, limit=per_page)
    return create_success_response(data=logs, meta=meta, request=request)
