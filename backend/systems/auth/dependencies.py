from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from sqlmodel import Session

from core.config import settings
from core.database import get_session
from systems.admin.models.user import User
from systems.admin.services.user_service import UserService
from systems.auth.services.rbac_service import rbac_service

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

user_service = UserService()


def get_current_user(
    session: Session = Depends(get_session), token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Could not validate credentials",
            )
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    user = user_service.get(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def require_system_access(system: str):
    def _checker(
        session: Session = Depends(get_session),
        current_user: User = Depends(get_current_user),
    ) -> None:
        if not rbac_service.has_system_access(session, current_user, system):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' cannot access {system} system",
            )

    return _checker


def require_permission(permission: str):
    def _checker(
        session: Session = Depends(get_session),
        current_user: User = Depends(get_current_user),
    ) -> None:
        if not rbac_service.has_permission(session, current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' lacks permission: {permission}",
            )

    return _checker