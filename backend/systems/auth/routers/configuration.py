from fastapi import APIRouter, Depends, Query, Request
from sqlmodel import Session

from core.database import get_session
from core.schemas import (
    ConfigCreate,
    ConfigRead,
    GenericResponse,
    create_success_response,
    make_pagination_meta,
)
from systems.auth.services.configuration_service import AuthConfigService
from systems.auth.dependencies import require_permission, get_current_user
from systems.admin.models.user import User

router = APIRouter()
config_service = AuthConfigService()


@router.get(
    "",
    response_model=GenericResponse[list[ConfigRead]],
)
async def list_auth_settings(
    request: Request,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=500),
    key: str | None = None,
    category: str | None = None,
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("auth:config:manage")),
):
    skip = (page - 1) * per_page
    settings, total = config_service.get_all(
        session, skip=skip, limit=per_page, key=key, category=category
    )

    return create_success_response(
        data=settings,
        meta=make_pagination_meta(total=total, skip=skip, limit=per_page, page=page, per_page=per_page),
        request=request,
    )


@router.post(
    "",
    response_model=GenericResponse[ConfigRead],
    status_code=201,
)
async def create_auth_setting(
    setting_data: ConfigCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("auth:config:manage")),
):
    config_service.set_value(
        session,
        setting_data.key,
        setting_data.value,
        category=setting_data.category,
        description=setting_data.description,
        crucial=False,
        actor_id=current_user.id,
    )
    session.commit()

    setting = config_service.get_by_key(
        session, setting_data.key, category=setting_data.category
    )

    return create_success_response(data=setting, request=request)
