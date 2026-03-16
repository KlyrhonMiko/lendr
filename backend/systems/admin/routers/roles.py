import json
from typing import Any
from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from core.database import get_session
from core.schemas import GenericResponse, create_success_response
from systems.admin.models.user import User
from systems.admin.schemas.role_schemas import RolePermissionUpdate
from systems.admin.services.configuration_service import ConfigurationService
from systems.auth.dependencies import get_current_user, require_permission

router = APIRouter()
config_service = ConfigurationService()

@router.post("/permissions", response_model=GenericResponse[dict], status_code=200)
async def update_role_permissions(
    data: RolePermissionUpdate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:roles:manage")),
):
    # Prepare the JSON value
    payload: dict[str, Any] = {
        "systems": data.systems,
        "permissions": data.permissions,
    }
    if data.display_name:
        payload["display_name"] = data.display_name

    # Update or create the rbac_roles configuration
    config_service.set_value(
        session,
        key=data.role.lower(),
        value=json.dumps(payload),
        category="rbac_roles",
        description=f"Dynamic override for role: {data.role}"
    )

    return create_success_response(
        message=f"Permissions for role '{data.role}' updated successfully",
        data=payload,
        request=request
    )
