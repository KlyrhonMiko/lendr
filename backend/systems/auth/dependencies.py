from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from sqlmodel import Session

from core.config import settings
from core.database import get_session
from systems.admin.models.user import User
from systems.admin.services.user_service import UserService
from systems.admin.services.audit_service import audit_service
from systems.auth.services.rbac_service import rbac_service

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
user_service = UserService()


def get_current_user(session: Session = Depends(get_session), token: str = Depends(reusable_oauth2)) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        session_id = payload.get("session_id")
        
        if not user_id or not session_id:
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

    from systems.auth.services.auth_service import auth_service
    
    is_valid = False
    if str(session_id).startswith("BSE"):
        is_valid = auth_service.is_borrower_session_valid(session, session_id)
    elif str(session_id).startswith("USE"):
        is_valid = auth_service.is_user_session_valid(session, session_id)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or been revoked. Please log in again.",
        )

    return user



def require_system_access(system: str):
    def _checker(session: Session = Depends(get_session), current_user: User = Depends(get_current_user),) -> None:
        if not rbac_service.has_system_access(session, current_user, system):
            detail = f"Role '{current_user.role}' cannot access {system} system"
            
            # Log security violation for cross-system attempts (especially admin)
            audit_service.log_action(
                db=session,
                entity_type="security",
                entity_id=system,
                action="unauthorized_access",
                reason_code="403-FORBIDDEN",
                actor_id=current_user.id
            )
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=detail,
            )

    return _checker


def require_permission(permission: str | list[str]):
    def _checker(session: Session = Depends(get_session), current_user: User = Depends(get_current_user),) -> None:
        perms = [permission] if isinstance(permission, str) else permission
        if not any(rbac_service.has_permission(session, current_user, p) for p in perms):
            required = ", ".join(perms) if isinstance(permission, list) else permission
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' lacks any of the required permissions: {required}",
            )

    return _checker