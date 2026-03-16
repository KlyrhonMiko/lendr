from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from core.database import get_session
from core.schemas import (
    ConfigCreate,
    ConfigRead,
    GenericResponse,
    PaginationMeta,
    create_success_response,
)
from systems.auth.services.configuration_service import AuthConfigService
from systems.auth.dependencies import require_permission

router = APIRouter()
config_service = AuthConfigService()


@router.get(
    "",
    response_model=GenericResponse[List[ConfigRead]],
)
async def list_auth_settings(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    key: str | None = None,
    category: str | None = None,
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("auth:config:manage")),
):
    settings, total = config_service.get_all(
        session, skip=skip, limit=limit, key=key, category=category
    )

    return create_success_response(
        data=settings,
        meta=PaginationMeta(total=total, limit=limit, offset=skip),
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
    _: None = Depends(require_permission("auth:config:manage")),
):
    config_service.set_value(
        session,
        setting_data.key,
        setting_data.value,
        category=setting_data.category,
        description=setting_data.description,
    )
    setting = config_service.get_by_key(
        session, setting_data.key, category=setting_data.category
    )

    return create_success_response(data=setting, request=request)
