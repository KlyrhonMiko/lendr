from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from core.database import get_session
from core.deps import get_current_user
from core.schemas import GenericResponse, PaginationMeta, create_success_response
from systems.admin.models.user import User
from systems.inventory.schemas.requested_item_schemas import (
    RequestedItemCreate,
    RequestedItemRead,
)
from systems.inventory.services.requested_item_service import RequestedItemService
from systems.auth.dependencies import require_permission

router = APIRouter()
req_service = RequestedItemService()


@router.post("", response_model=GenericResponse[RequestedItemRead], status_code=201)
async def create_requested_item(
    request_data: RequestedItemCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:requested_items:manage")),
):
    payload = request_data.model_dump()
    if not payload.get("requested_by"):
        payload["requested_by"] = current_user.user_id
    create_schema = RequestedItemCreate(**payload)
    try:
        db_obj = req_service.create_request(session, create_schema)

        return create_success_response(
            data=db_obj, message="Requested item created", request=request
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=GenericResponse[List[RequestedItemRead]])
async def list_requested_items(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:requested_items:manage")),
):
    items, total = req_service.get_all(session, skip=skip, limit=limit)

    return create_success_response(
        data=items,
        meta=PaginationMeta(total=total, limit=limit, offset=skip),
        request=request,
    )
