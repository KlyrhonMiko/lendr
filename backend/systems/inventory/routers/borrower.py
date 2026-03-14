from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session
from typing import List

from core.database import get_session
from core.deps import get_current_user
from core.schemas import GenericResponse, create_success_response
from systems.inventory.models.borrow_request import BorrowRequest
from systems.admin.models.user import User
from systems.inventory.schemas.borrow_request_schemas import (
    BorrowRequestBatchCreate,
    BorrowRequestCreate,
    BorrowRequestRead,
)
from systems.inventory.services.borrow_request_service import BorrowService

router = APIRouter()
borrow_service = BorrowService()


def _borrower_portal_payload(payload: dict, current_user: User) -> dict:
    merged = {**payload}
    merged["request_channel"] = "borrower_portal"
    merged["borrower_id"] = current_user.user_id
    return merged

@router.post("/requests", response_model=GenericResponse[BorrowRequestRead])
async def borrower_submit_request(
    request: Request,
    schema: BorrowRequestCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    portal_schema = BorrowRequestCreate(
        **_borrower_portal_payload(schema.model_dump(), current_user)
    )

    try:
        created_request = borrow_service.create_request(session, portal_schema)
        return create_success_response(
            data=created_request,
            message="Request submitted successfully via Portal",
            request=request
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/batch", response_model=GenericResponse[List[BorrowRequestRead]])
async def borrower_submit_batch_request(
    request: Request,
    batch_schema: BorrowRequestBatchCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    portal_schema = BorrowRequestBatchCreate(
        **_borrower_portal_payload(batch_schema.model_dump(), current_user)
    )

    try:
        created_requests = borrow_service.create_batch_requests(session, portal_schema)
        return create_success_response(
            data=created_requests,
            message=f"{len(created_requests)} requests submitted successfully via Portal",
            request=request
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
