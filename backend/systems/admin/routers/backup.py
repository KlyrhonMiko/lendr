import os
from typing import List

from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session

from core.database import get_session
from core.deps import get_current_user
from systems.auth.dependencies import require_permission
from core.schemas import GenericResponse, create_success_response
from systems.admin.models.user import User
from systems.admin.schemas.backup_schemas import BackupRunRead, BackupTrigger
from systems.admin.services.backup_service import backup_service

router = APIRouter()


@router.post("/trigger", response_model=GenericResponse[BackupRunRead])
async def trigger_backup(
    request: Request,
    trigger: BackupTrigger,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:backup:manage")),
):
    """
    Manually trigger a database backup.
    """
    backup_run = backup_service.trigger_backup(
        session, 
        destination=trigger.destination, 
        actor_id=current_user.id
    )
    return create_success_response(
        data=backup_run,
        message=f"Backup {backup_run.backup_id} started with status: {backup_run.status}",
        request=request
    )


@router.get("/runs", response_model=GenericResponse[List[BackupRunRead]])
async def list_backup_runs(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:backup:manage")),
):
    """
    List all backup runs and their status.
    """
    runs = backup_service.list_backup_runs(session)
    return create_success_response(
        data=runs,
        message="Backup runs retrieved successfully",
        request=request
    )


@router.get("/artifacts/{artifact_id}/download")
async def download_artifact(
    artifact_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:backup:manage")),
):
    """
    Download a specific backup artifact.
    """
    artifact = backup_service.get_artifact(session, artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    if not os.path.exists(artifact.file_path_or_key):
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path=artifact.file_path_or_key,
        filename=os.path.basename(artifact.file_path_or_key),
        media_type="application/sql"
    )
