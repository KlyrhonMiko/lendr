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
from systems.inventory.services.configuration_service import (
    BorrowerConfigService,
    InventoryConfigService,
)
from systems.auth.dependencies import require_permission

router = APIRouter()
inventory_service = InventoryConfigService()
borrower_service = BorrowerConfigService()

# --- Inventory Config ---


@router.get(
    "/inventory",
    response_model=GenericResponse[List[ConfigRead]],
)
async def list_inventory_settings(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    key: str | None = None,
    category: str | None = None,
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    settings, total = inventory_service.get_all(
        session, skip=skip, limit=limit, key=key, category=category
    )

    return create_success_response(
        data=settings,
        meta=PaginationMeta(total=total, limit=limit, offset=skip),
        request=request,
    )


@router.post(
    "/inventory",
    response_model=GenericResponse[ConfigRead],
    status_code=201,
)
async def create_inventory_setting(
    setting_data: ConfigCreate,
    request: Request,
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    inventory_service.set_value(
        session,
        setting_data.key,
        setting_data.value,
        category=setting_data.category,
        description=setting_data.description,
    )
    setting = inventory_service.get_by_key(
        session, setting_data.key, category=setting_data.category
    )

    return create_success_response(data=setting, request=request)


# --- Borrower Config ---


@router.get(
    "/borrower",
    response_model=GenericResponse[List[ConfigRead]],
)
async def list_borrower_settings(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    key: str | None = None,
    category: str | None = None,
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    settings, total = borrower_service.get_all(
        session, skip=skip, limit=limit, key=key, category=category
    )

    return create_success_response(
        data=settings,
        meta=PaginationMeta(total=total, limit=limit, offset=skip),
        request=request,
    )


@router.post(
    "/borrower",
    response_model=GenericResponse[ConfigRead],
    status_code=201,
)
async def create_borrower_setting(
    setting_data: ConfigCreate,
    request: Request,
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    borrower_service.set_value(
        session,
        setting_data.key,
        setting_data.value,
        category=setting_data.category,
        description=setting_data.description,
    )
    setting = borrower_service.get_by_key(
        session, setting_data.key, category=setting_data.category
    )

    return create_success_response(data=setting, request=request)
