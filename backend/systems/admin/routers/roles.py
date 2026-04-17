import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from core.database import get_session
from core.schemas import GenericResponse, create_success_response
from systems.admin.models.user import User
from systems.admin.schemas.role_schemas import RolePermissionUpdate
from systems.auth.dependencies import get_current_user, require_permission
from systems.auth.services.configuration_service import AuthConfigService
from systems.auth.services.rbac_service import normalize_role, validate_role_policy_payload

router = APIRouter()
config_service = AuthConfigService()

@router.post("/permissions", response_model=GenericResponse[dict], status_code=200)
async def update_role_permissions(
    data: RolePermissionUpdate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:roles:manage")),
):
    role_key = normalize_role(data.role)

    # Prepare the JSON value
    payload: dict[str, Any] = {
        "systems": data.systems,
        "permissions": data.permissions,
    }
    if data.display_name:
        payload["display_name"] = data.display_name

    try:
        validated_payload = validate_role_policy_payload(role_key, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Update or create the rbac_roles configuration
    config_service.set_value(
        session,
        key=role_key,
        value=json.dumps(validated_payload),
        category="rbac_roles",
        description=f"Dynamic override for role: {role_key}",
        actor_id=current_user.id,
    )
    session.commit()

    return create_success_response(
        message=f"Permissions for role '{role_key}' updated successfully",
        data=validated_payload,
        request=request
    )
