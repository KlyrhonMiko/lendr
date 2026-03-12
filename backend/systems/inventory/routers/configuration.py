from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from core.database import get_session
from core.deps import get_current_user
from core.schemas import GenericResponse, PaginationMeta, create_success_response
from systems.inventory.models.user import User
from systems.inventory.schemas.configuration_schemas import (
    SystemSettingCreate,
    SystemSettingRead,
    SystemSettingUpdate,
)
from systems.inventory.services.configuration_service import ConfigurationService

router = APIRouter()
config_service = ConfigurationService()

@router.get("", response_model=GenericResponse[list[SystemSettingRead]], responses={401: {"model": GenericResponse}})
async def list_settings(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    settings, total = config_service.get_all(session, skip=skip, limit=limit)
    return create_success_response(
        data=settings, 
        meta=PaginationMeta(total=total, limit=limit, offset=skip),
        request=request
    )

@router.post("", response_model=GenericResponse[SystemSettingRead], status_code=201, responses={400: {"model": GenericResponse}, 401: {"model": GenericResponse}})
async def create_setting(
    setting_data: SystemSettingCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if config_service.get_by_key(session, setting_data.key):
        raise HTTPException(status_code=400, detail=f"Setting '{setting_data.key}' already exists")

    config_service.set_value(
        session, 
        setting_data.key, 
        setting_data.value, 
        category=setting_data.category,
        description=setting_data.description
    )
    
    return create_success_response(
        message=f"Setting '{setting_data.key}' created successfully",
        data=config_service.get_by_key(session, setting_data.key),
        request=request
    )

@router.patch("/{key}", response_model=GenericResponse[SystemSettingRead], responses={404: {"model": GenericResponse}, 400: {"model": GenericResponse}, 401: {"model": GenericResponse}})
async def update_setting(
    key: str,
    setting_data: SystemSettingUpdate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not config_service.get_by_key(session, key):
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    config_service.set_value(session, key, setting_data.value)
    
    return create_success_response(
        message=f"Setting '{key}' updated successfully",
        data=config_service.get_by_key(session, key),
        request=request
    )
