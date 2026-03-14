from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from core.database import get_session
from core.deps import get_current_user
from core.schemas import GenericResponse, PaginationMeta, create_success_response
from systems.inventory.models.user import User
from systems.inventory.schemas.requested_item_schemas import (
    RequestedItemCreate,
    RequestedItemRead,
    RequestedItemUpdate,
)
from systems.inventory.services.requested_item_service import RequestedItemService

router = APIRouter()
req_service = RequestedItemService()

@router.post("", response_model=GenericResponse[RequestedItemRead], status_code=201)
async def create_requested_item(
    request_data: RequestedItemCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not request_data.requested_by:
        request_data.requested_by = current_user.user_id
    try:
        db_obj = req_service.create_request(session, request_data)
        return create_success_response(data=db_obj, message="Requested item created", request=request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=GenericResponse[list[RequestedItemRead]])
async def list_requested_items(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    items, total = req_service.get_all(session, skip=skip, limit=limit)
    return create_success_response(
        data=items,
        meta=PaginationMeta(total=total, limit=limit, offset=skip),
        request=request
    )
