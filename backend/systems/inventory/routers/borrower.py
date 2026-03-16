from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from core.database import get_session
from core.deps import get_current_user
from core.schemas import GenericResponse, create_success_response
from systems.admin.models.user import User
from systems.inventory.schemas.borrow_request_schemas import (
    BorrowRequestCreate,
    BorrowRequestRead,
)
from systems.inventory.services.borrow_request_service import BorrowService
from systems.auth.dependencies import require_permission

router = APIRouter()
borrow_service = BorrowService()


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

