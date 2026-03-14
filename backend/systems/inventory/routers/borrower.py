from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session
from typing import List

from core.config import settings
from core.database import get_session
from core.deps import get_current_user
from core.schemas import GenericResponse, create_success_response
from systems.inventory.models.borrow_request import BorrowRequest
from systems.inventory.models.user import User
from systems.inventory.schemas.user_schemas import Token
from systems.inventory.schemas.borrow_request_schemas import (
    BorrowRequestBatchCreate,
    BorrowRequestCreate,
    BorrowRequestRead,
)
from systems.inventory.services.borrow_request_service import BorrowService
from systems.inventory.services.auth_service import auth_service

router = APIRouter()
borrow_service = BorrowService()

@router.post("/auth/login", response_model=Token)
async def borrower_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    # Using established username=password=pin logic
    user = auth_service.authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect PIN",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={"sub": user.user_id}, expires_delta=access_token_expires
    )
    
    # Persist session in database
    auth_service.create_borrower_session(
        session=session,
        user_id=user.user_id,
        expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")

@router.post("/requests", response_model=GenericResponse[BorrowRequestRead])
async def borrower_submit_request(
    request: Request,
    schema: BorrowRequestCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    schema.request_channel = "borrower_portal"
    schema.borrower_id = current_user.user_id

    if schema.is_emergency:
        schema.compliance_followup_required = True
        schema.compliance_followup_notes = "Emergency request from portal. Verify condition manually."

    try:
        created_request = borrow_service.create_request(session, schema)
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
    batch_schema.request_channel = "borrower_portal"
    batch_schema.borrower_id = current_user.user_id
    
    if batch_schema.is_emergency:
        batch_schema.compliance_followup_required = True
        batch_schema.compliance_followup_notes = "Emergency request from portal. Verify condition manually."

    try:
        created_requests = borrow_service.create_batch_requests(session, batch_schema)
        return create_success_response(
            data=created_requests,
            message=f"{len(created_requests)} requests submitted successfully via Portal",
            request=request
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
