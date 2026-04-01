from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session

from core.database import get_session
from core.deps import get_current_user
from core.schemas import GenericResponse, create_success_response, make_pagination_meta
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
        session.commit()
        session.refresh(db_obj)

        return create_success_response(
            data=db_obj, message="Requested item created", request=request
        )
    except ValueError as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=GenericResponse[list[RequestedItemRead]])
async def list_requested_items(
    request: Request,
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=500, description="Records per page"),
    search: Optional[str] = Query(default=None, description="Search by item name (case-insensitive)"),
    status: Optional[str] = Query(default=None, description="Filter by status (pending, procurement, fulfilled, cancelled)"),
    requested_by: Optional[str] = Query(default=None, description="Filter by requesting user ID (exact match)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:requested_items:manage")),
):
    skip = (page - 1) * per_page
    items, total = req_service.get_all(
        session,
        skip=skip,
        limit=per_page,
        search=search,
        status=status,
        requested_by=requested_by,
    )

    return create_success_response(
        data=items,
        meta=make_pagination_meta(total=total, skip=skip, limit=per_page, page=page, per_page=per_page),
        request=request,
    )

