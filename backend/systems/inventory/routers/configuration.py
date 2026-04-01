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
from systems.inventory.services.configuration_service import (
    BorrowerConfigService,
    InventoryConfigService,
)
from systems.auth.dependencies import require_permission, get_current_user
from systems.admin.models.user import User

router = APIRouter()
inventory_service = InventoryConfigService()
borrower_service = BorrowerConfigService()

# --- Inventory Config ---


@router.get(
    "/inventory",
    response_model=GenericResponse[list[ConfigRead]],
)
async def list_inventory_settings(
    request: Request,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=500),
    key: str | None = None,
    category: str | None = None,
    session: Session = Depends(get_session),
    _: None = Depends(require_permission(["inventory:config:manage", "inventory:items:view"])),
):
    skip = (page - 1) * per_page
    settings, total = inventory_service.get_all(
        session, skip=skip, limit=per_page, key=key, category=category
    )

    return create_success_response(
        data=settings,
        meta=make_pagination_meta(total=total, skip=skip, limit=per_page, page=page, per_page=per_page),
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
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    inventory_service.set_value(
        session,
        setting_data.key,
        setting_data.value,
        category=setting_data.category,
        description=setting_data.description,
        actor_id=current_user.id,
    )
    session.commit()

    setting = inventory_service.get_by_key(
        session, setting_data.key, category=setting_data.category
    )

    return create_success_response(data=setting, request=request)


@router.delete(
    "/inventory/{category}/{key}",
    response_model=GenericResponse[ConfigRead],
)
async def delete_inventory_setting(
    category: str,
    key: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    setting = inventory_service.get_by_key(session, key, category=category)
    if not setting:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Setting not found")

    inventory_service.delete(session, setting, actor_id=current_user.id)
    session.commit()
    return create_success_response(data=setting, request=request)


# --- Borrower Config ---


@router.get(
    "/borrower",
    response_model=GenericResponse[list[ConfigRead]],
)
async def list_borrower_settings(
    request: Request,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=500),
    key: str | None = None,
    category: str | None = None,
    session: Session = Depends(get_session),
    _: None = Depends(require_permission(["inventory:config:manage", "inventory:items:view"])),
):
    skip = (page - 1) * per_page
    settings, total = borrower_service.get_all(
        session, skip=skip, limit=per_page, key=key, category=category
    )

    return create_success_response(
        data=settings,
        meta=make_pagination_meta(total=total, skip=skip, limit=per_page, page=page, per_page=per_page),
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
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    borrower_service.set_value(
        session,
        setting_data.key,
        setting_data.value,
        category=setting_data.category,
        description=setting_data.description,
        actor_id=current_user.id,
    )
    session.commit()

    setting = borrower_service.get_by_key(
        session, setting_data.key, category=setting_data.category
    )

    return create_success_response(data=setting, request=request)


@router.delete(
    "/borrower/{category}/{key}",
    response_model=GenericResponse[ConfigRead],
)
async def delete_borrower_setting(
    category: str,
    key: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    setting = borrower_service.get_by_key(session, key, category=category)
    if not setting:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Setting not found")

    borrower_service.delete(session, setting, actor_id=current_user.id)
    session.commit()
    return create_success_response(data=setting, request=request)
