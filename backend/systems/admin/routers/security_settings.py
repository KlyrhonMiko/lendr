from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from core.database import get_session
from core.schemas import GenericResponse, create_success_response
from systems.admin.models.user import User
from systems.admin.schemas.security_settings import RbacOverviewSettings, SecuritySettingsPayload
from systems.admin.services.security_settings_service import security_settings_service
from systems.auth.dependencies import get_current_user, require_permission


router = APIRouter()


@router.get("", response_model=GenericResponse[SecuritySettingsPayload])
async def get_security_settings(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    payload = security_settings_service.build_payload(session)
    return create_success_response(
        data=payload,
        message="Security settings retrieved successfully",
        request=request,
    )


@router.get("/rbac-overview", response_model=GenericResponse[RbacOverviewSettings])
async def get_security_rbac_overview(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    overview = security_settings_service.build_rbac_overview(session)
    return create_success_response(
        data=overview,
        message="Security RBAC overview retrieved successfully",
        request=request,
    )


@router.put("", response_model=GenericResponse[SecuritySettingsPayload])
async def update_security_settings(
    payload: SecuritySettingsPayload,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    updated_payload = security_settings_service.update_payload(
        session,
        payload,
        actor_id=current_user.id,
    )
    session.commit()

    return create_success_response(
        data=updated_payload,
        message="Security settings synchronized successfully",
        request=request,
    )
