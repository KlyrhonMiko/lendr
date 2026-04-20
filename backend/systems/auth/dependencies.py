import hashlib
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from pydantic import ValidationError
from sqlmodel import Session

from core.database import engine, get_session
from systems.admin.models.user import User
from systems.admin.services.user_service import UserService
from systems.admin.services.audit_service import audit_service
from systems.auth.services.rbac_service import rbac_service
from utils.security import decode_access_token

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
user_service = UserService()


def _persist_audit_event(
    *,
    entity_type: str,
    entity_id: str,
    action: str,
    reason_code: str | None = None,
    actor_id: UUID | None = None,
    after: dict | None = None,
) -> None:
    """Persist dependency-level security telemetry outside request transactions."""
    try:
        with Session(engine) as audit_session:
            audit_service.log_action(
                db=audit_session,
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                reason_code=reason_code,
                actor_id=actor_id,
                after=after,
            )
            audit_session.commit()
    except Exception:
        # Authentication and authorization checks should not fail due to telemetry issues.
        pass


def _validate_session_with_activity_touch(session_id: str) -> bool:
    """Validate and touch session activity in an isolated session boundary."""
    from systems.auth.services.auth_service import auth_service

    with Session(engine) as validation_session:
        if str(session_id).startswith("BSE"):
            is_valid = auth_service.is_borrower_session_valid(
                validation_session,
                session_id,
                touch_activity=True,
            )
        elif str(session_id).startswith("USE"):
            is_valid = auth_service.is_user_session_valid(
                validation_session,
                session_id,
                touch_activity=True,
            )
        else:
            is_valid = False

        has_changes = (
            bool(validation_session.new)
            or bool(validation_session.dirty)
            or bool(validation_session.deleted)
        )
        if has_changes:
            validation_session.commit()

        return is_valid


def _hash_value(value: str | None) -> str:
    if not value:
        return "unknown"
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def _log_auth_validation_failure(
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

    _persist_audit_event(
        entity_type="auth",
        entity_id=metadata["user_hash"],
        action=action,
        after=metadata,
    )


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
            _request,
            "token_subject_not_found",
            user_id=user_id,
            session_id=session_id,
        )
        raise HTTPException(status_code=404, detail="User not found")

    is_valid = _validate_session_with_activity_touch(session_id)

    if not is_valid:
        _log_auth_validation_failure(
            _request,
            "session_validation_failed",
            user_id=user_id,
            session_id=session_id,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or been revoked. Please log in again.",
        )

    return user



def require_system_access(system: str):
    def _checker(session: Session = Depends(get_session), current_user: User = Depends(get_current_user),) -> None:
        if not rbac_service.has_system_access(session, current_user, system):
            detail = f"Role '{current_user.role}' cannot access {system} system"

            _persist_audit_event(
                entity_type="security",
                entity_id=system,
                action="unauthorized_access",
                reason_code="403-FORBIDDEN",
                actor_id=current_user.id,
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

            _persist_audit_event(
                entity_type="security",
                entity_id=required,
                action="unauthorized_access",
                reason_code="403-FORBIDDEN",
                actor_id=current_user.id,
                after={
                    "role": current_user.role,
                    "required_permissions": perms,
                },
            )

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' lacks any of the required permissions: {required}",
            )

    return _checker
