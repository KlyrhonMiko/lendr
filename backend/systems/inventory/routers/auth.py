from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session
from core.database import get_session
from systems.inventory.services.auth_service import auth_service
from utils.security import create_access_token
from core.deps import get_current_user
from systems.inventory.models.user import User
from systems.inventory.schemas.user_schemas import UserRead

router = APIRouter()

@router.post("/login")
def login(
    session: Session = Depends(get_session),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    user = auth_service.authenticate(
        session, username_or_email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    return {
        "access_token": create_access_token(user.user_id),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_user)) -> Any:
    return current_user