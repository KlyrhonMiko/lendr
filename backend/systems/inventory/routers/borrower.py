from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session

from core.database import get_session
from core.deps import get_current_user
from core.schemas import GenericResponse, create_success_response, make_pagination_meta
from systems.admin.models.user import User
from systems.inventory.schemas.borrow_request_schemas import (
    BorrowRequestCreate,
    BorrowRequestRead,
)
from systems.inventory.services.borrow_request_service import BorrowService
from systems.auth.dependencies import require_permission

router = APIRouter()
borrow_service = BorrowService()


@router.get("/requests", response_model=GenericResponse[list[BorrowRequestRead]])
async def borrower_get_requests(
    request: Request,
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=200, description="Records per page"),
    status: Optional[str] = Query(default=None, description="Filter by request status (pending, approved, returned, etc.)"),
    is_emergency: Optional[bool] = Query(default=None, description="Filter by emergency flag"),
    date_from: Optional[datetime] = Query(default=None, description="Filter requests from this date (inclusive)"),
    date_to: Optional[datetime] = Query(default=None, description="Filter requests up to this date (inclusive)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:borrower_portal:access")),
):
    try:
        skip = (page - 1) * per_page
        requests, total = borrow_service.get_by_borrower(
            session,
            borrower_uuid=current_user.id,
            skip=skip,
            limit=per_page,
            status=status,
            is_emergency=is_emergency,
            date_from=date_from,
            date_to=date_to,
        )
        serialized = borrow_service.serialize_borrow_requests(session, requests)
        return create_success_response(
            data=serialized,
            meta=make_pagination_meta(total=total, skip=skip, limit=per_page, page=page, per_page=per_page),
            request=request,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/requests", response_model=GenericResponse[BorrowRequestRead])
async def borrower_submit_request(
    request: Request,
    schema: BorrowRequestCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:borrower_portal:access")),
):
    try:
        created_request = borrow_service.create_request(
            session,
            schema,
            borrower_id=current_user.user_id,
            request_channel="borrower_portal",
            actor_id=current_user.id,
        )
        return create_success_response(
            data=borrow_service.serialize_borrow_request(session, created_request),
            message="Request submitted successfully via Portal",
            request=request
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

