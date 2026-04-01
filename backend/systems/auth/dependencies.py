import hashlib

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from pydantic import ValidationError
from sqlmodel import Session

from core.database import get_session
from systems.admin.models.user import User
from systems.admin.services.user_service import UserService
from systems.admin.services.audit_service import audit_service
from systems.auth.services.rbac_service import rbac_service
from utils.security import decode_access_token

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
user_service = UserService()


def _commit_if_needed(session: Session) -> None:
    commit = getattr(session, "commit", None)
    has_changes = bool(getattr(session, "new", ())) or bool(getattr(session, "dirty", ())) or bool(getattr(session, "deleted", ()))
    if callable(commit) and has_changes:
        commit()


def _hash_value(value: str | None) -> str:
    if not value:
        return "unknown"
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def _log_auth_validation_failure(
    session: Session,
    request: Request,
    action: str,
    *,
    user_id: str | None = None,
    session_id: str | None = None,
) -> None:
    client_ip = request.client.host if request.client else "unknown"
    metadata = {
        "path": request.url.path,
        "method": request.method,
        "ip_hash": _hash_value(client_ip),
        "user_hash": _hash_value(user_id),
        "session_hash": _hash_value(session_id),
    }

    try:
        audit_service.log_action(
            db=session,
            entity_type="auth",
            entity_id=metadata["user_hash"],
            action=action,
            after=metadata,
        )
        session.commit()
    except Exception:
        # Auth validation should not fail due to telemetry issues.
        pass


def get_current_user(
    _request: Request,
    session: Session = Depends(get_session),
    token: str = Depends(reusable_oauth2),
) -> User:
    user_id: str | None = None
    session_id: str | None = None

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        session_id = payload.get("session_id")
        
        if not user_id or not session_id:
            _log_auth_validation_failure(
                session,
                _request,
                "token_missing_subject_or_session",
                user_id=user_id,
                session_id=session_id,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Could not validate credentials",
            )
    except (JWTError, ValidationError):
        _log_auth_validation_failure(
            session,
            _request,
            "token_decode_failure",
            user_id=user_id,
            session_id=session_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    user = user_service.get(session, user_id)
    if not user:
        _log_auth_validation_failure(
            session,
            _request,
            "token_subject_not_found",
            user_id=user_id,
            session_id=session_id,
        )
        raise HTTPException(status_code=404, detail="User not found")

    from systems.auth.services.auth_service import auth_service
    
    is_valid = False
    if str(session_id).startswith("BSE"):
        is_valid = auth_service.is_borrower_session_valid(
            session,
            session_id,
            touch_activity=True,
        )
    elif str(session_id).startswith("USE"):
        is_valid = auth_service.is_user_session_valid(
            session,
            session_id,
            touch_activity=True,
        )

    if not is_valid:
        _log_auth_validation_failure(
            session,
            _request,
            "session_validation_failed",
            user_id=user_id,
            session_id=session_id,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or been revoked. Please log in again.",
        )

    _commit_if_needed(session)

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
            session.commit()
            
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