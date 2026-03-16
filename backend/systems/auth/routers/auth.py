from systems.auth.dependencies import reusable_oauth2
from datetime import timedelta

from jose import jwt

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

from core.config import settings
from core.database import get_session
from core.schemas import GenericResponse, create_success_response
from systems.admin.models.user import User
from systems.admin.schemas.user_schemas import UserRead
from systems.auth.dependencies import get_current_user, require_permission
from systems.auth.schemas.auth_schemas import RolePolicyRead, Token
from systems.auth.services.auth_service import AuthService
from systems.auth.services.rbac_service import rbac_service

router = APIRouter()
auth_service = AuthService()


@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = auth_service.authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    if user.role == "borrower":
        db_session = auth_service.create_borrower_session(
            session=session,
            user_id=user.user_id,
            expires_delta=access_token_expires,
            user_uuid=user.id,
        )
    else:
        db_session = auth_service.create_user_session(
                session=session,
                user_uuid=user.id,
                expires_delta=access_token_expires
            )

    access_token = auth_service.create_access_token(
        data={"sub": user.user_id, "session_id": db_session.session_id}, 
        expires_delta=access_token_expires
    )

    return Token(access_token=access_token, token_type="bearer")


@router.post("/borrower/login", response_model=Token)
async def borrower_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = auth_service.authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect PIN",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    if user.role == "borrower":
        db_session = auth_service.create_borrower_session(
            session=session,
            user_id=user.user_id,
            expires_delta=access_token_expires,
            user_uuid=user.id,
        )
    else:
        db_session = auth_service.create_user_session(
                session=session,
                user_uuid=user.id,
                expires_delta=access_token_expires
            )

    access_token = auth_service.create_access_token(
        data={"sub": user.user_id, "session_id": db_session.session_id}, 
        expires_delta=access_token_expires
    )

    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=GenericResponse[UserRead], responses={401: {"model": GenericResponse}})
async def read_users_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("auth:session:manage")),
):

    return create_success_response(data=current_user, request=request)


@router.get(
    "/rbac/policy",
    response_model=GenericResponse[RolePolicyRead],
    responses={401: {"model": GenericResponse}, 403: {"model": GenericResponse}},
)
async def get_my_policy(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("auth:session:manage")),
):
    policy = rbac_service.get_role_policy(session, current_user.role)
    data = RolePolicyRead(
        role=current_user.role,
        display_name=str(policy.get("display_name", current_user.role)),
        systems=[str(value) for value in policy.get("systems", [])],
        permissions=[str(value) for value in policy.get("permissions", [])],
    )

    return create_success_response(data=data, request=request)


@router.post("/logout", response_model=GenericResponse)
async def logout(
    request: Request,
    session: Session = Depends(get_session),
    token: str = Depends(reusable_oauth2),
    _: None = Depends(require_permission("auth:session:manage")),
):
    try:
        # Decode token to get session_id and user role
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        session_id = payload.get("session_id")
        user_id = payload.get("sub")
        
        user = auth_service.user_service.get(session, user_id)
        if user and session_id:
            if user.role == "borrower":
                auth_service.revoke_borrower_session(session, session_id)
            else:
                auth_service.revoke_user_session(session, session_id)
                
        return create_success_response(
            message="Successfully logged out",
            request=request
        )
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
