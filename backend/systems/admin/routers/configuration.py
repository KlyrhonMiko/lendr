from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from core.database import get_session
from core.schemas import (
    ConfigCreate,
    ConfigRead,
    ConfigUpdate,
    GenericResponse,
    PaginationMeta,
    create_success_response,
)
from systems.admin.models.user import User
from systems.admin.services.configuration_service import ConfigurationService
from systems.auth.dependencies import get_current_user, require_permission

router = APIRouter()
config_service = ConfigurationService()


@router.get(
    "",
    response_model=GenericResponse[list[ConfigRead]],
    responses={401: {"model": GenericResponse}},
)
async def list_settings(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    key: str | None = None,
    category: str | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    settings, total = config_service.get_all(
        session, skip=skip, limit=limit, key=key, category=category
    )

    return create_success_response(
        data=settings,
        meta=PaginationMeta(total=total, limit=limit, offset=skip),
        request=request,
    )


@router.get(
    "/categories",
    response_model=GenericResponse[list[str]],
    responses={401: {"model": GenericResponse}},
)
async def list_categories(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    categories = config_service.get_categories(session)

    return create_success_response(data=categories, request=request)


@router.get(
    "/tables",
    response_model=GenericResponse[list[str]],
    responses={401: {"model": GenericResponse}},
)
async def list_configurable_tables(
    request: Request,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    tables = config_service.list_tables()
    return create_success_response(data=tables, request=request)


@router.get(
    "/tables/{table_name}/columns",
    response_model=GenericResponse[list[str]],
    responses={400: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def list_configurable_columns(
    table_name: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    try:
        columns = config_service.list_columns(table_name)
        return create_success_response(data=columns, request=request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "",
    response_model=GenericResponse[ConfigRead],
    status_code=201,
    responses={400: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def create_setting(
    setting_data: ConfigCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    try:
        config_service.validate_category_exists(setting_data.category)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if config_service.get_by_key(
        session, setting_data.key, category=setting_data.category
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Setting '{setting_data.key}' already exists in category "
                f"'{setting_data.category}'"
            ),
        )

    config_service.set_value(
        session,
        setting_data.key,
        setting_data.value,
        category=setting_data.category,
        description=setting_data.description,
    )

    return create_success_response(
        message=f"Setting '{setting_data.key}' created successfully",
        data=config_service.get_by_key(
            session, setting_data.key, category=setting_data.category
        ),
        request=request,
    )


@router.patch(
    "/{key}",
    response_model=GenericResponse[ConfigRead],
    responses={
        404: {"model": GenericResponse},
        400: {"model": GenericResponse},
        401: {"model": GenericResponse},
    },
)
async def update_setting(
    key: str,
    setting_data: ConfigUpdate,
    request: Request,
    category: str = "general",
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    try:
        config_service.validate_category_exists(category)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        setting = config_service.get_by_key(session, key, category=category)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not setting:
        raise HTTPException(
            status_code=404,
            detail=f"Setting '{key}' not found in category '{category}'",
        )

    config_service.set_value(
        session,
        key,
        setting_data.value,
        category=category,
        description=setting_data.description,
    )

    return create_success_response(
        message=f"Setting '{key}' updated successfully",
        data=config_service.get_by_key(session, key, category=category),
        request=request,
    )


@router.delete(
    "/{key}",
    response_model=GenericResponse[ConfigRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def delete_setting(
    key: str,
    request: Request,
    category: str = "general",
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    setting = config_service.get_by_key(session, key, category=category)
    if not setting:
        raise HTTPException(
            status_code=404,
            detail=f"Setting '{key}' not found in category '{category}'",
        )

    config_service.delete(session, setting)

    return create_success_response(
        message=f"Setting '{key}' deleted successfully",
        data=setting,
        request=request,
    )


@router.post(
    "/{key}/restore",
    response_model=GenericResponse[ConfigRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def restore_setting(
    key: str,
    request: Request,
    category: str = "general",
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    setting = config_service.get_by_key(
        session, key, category=category, include_deleted=True
    )
    if not setting:
        raise HTTPException(
            status_code=404,
            detail=f"Setting '{key}' not found in category '{category}'",
        )

    config_service.restore(session, setting)

    return create_success_response(
        message=f"Setting '{key}' restored successfully",
        data=setting,
        request=request,
    )
