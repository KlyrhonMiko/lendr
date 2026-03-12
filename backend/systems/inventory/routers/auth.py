from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session
from datetime import timedelta

from core.database import get_session
from core.deps import get_current_user
from systems.inventory.services.auth_service import AuthService
from systems.inventory.schemas.user_schemas import Token, UserRead
from systems.inventory.models.user import User
from core.schemas import GenericResponse, create_success_response
from core.config import settings

router = APIRouter()
auth_service = AuthService()

@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    user = auth_service.authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={"sub": user.user_id}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")

@router.get("/me", response_model=GenericResponse[UserRead], responses={401: {"model": GenericResponse}})
async def read_users_me(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    return create_success_response(data=current_user, request=request)
