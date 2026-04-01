from collections import deque
from datetime import timedelta
import hashlib
import threading
import time
from dataclasses import dataclass

from jose import JWTError

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

from core.database import get_session
from core.schemas import GenericResponse, create_success_response
from systems.admin.models.user import User
from systems.admin.services.audit_service import audit_service
from systems.admin.schemas.user_schemas import UserRead
from systems.auth.dependencies import get_current_user, require_permission, reusable_oauth2
from systems.auth.schemas.auth_schemas import BootstrapPasswordRotateRequest, RolePolicyRead, Token
from systems.auth.services.auth_service import AuthService
from systems.auth.services.rbac_service import rbac_service
from utils.logging import get_logger
from utils.security import decode_access_token
from core.config import settings

router = APIRouter()
auth_service = AuthService()

BOOTSTRAP_ROTATION_REQUIRED_DETAIL = (
    "Bootstrap admin password rotation required. "
    "Use /api/auth/bootstrap/rotate-password before signing in."
)
AUTH_RATE_LIMIT_EXCEEDED_DETAIL = "Too many authentication attempts. Please try again later."


@dataclass(frozen=True)
class RateLimitRule:
    scope: str
    max_attempts: int
    window_seconds: int


AUTH_RATE_LIMIT_RULES: dict[str, tuple[RateLimitRule, ...]] = {
    "login": (
        RateLimitRule(scope="ip", max_attempts=5, window_seconds=60),
        RateLimitRule(scope="identity", max_attempts=20, window_seconds=3600),
    ),
    "borrower_login": (
        RateLimitRule(scope="ip", max_attempts=5, window_seconds=60),
        RateLimitRule(scope="identity", max_attempts=20, window_seconds=3600),
    ),
}

# Process-local limiter store. For multi-worker deployments, replace with shared storage.
_rate_limit_store: dict[str, deque[float]] = {}
_rate_limit_lock = threading.Lock()
logger = get_logger("auth")


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",", maxsplit=1)[0].strip()

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def _normalize_identity(value: str) -> str:
    return value.strip().lower()


def _hash_value(value: str | None) -> str:
    if not value:
        return "unknown"
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def _safe_log_auth_event(
    *,
    session: Session,
    request: Request,
    endpoint: str,
    action: str,
    username: str,
    device_id: str | None,
) -> None:
    metadata = {
        "endpoint": endpoint,
        "username": username,
        "ip_hash": _hash_value(_get_client_ip(request)),
        "device_id_hash": _hash_value(device_id),
    }

    try:
        audit_service.log_action(
            db=session,
            entity_type="auth",
            entity_id=username[:100] or endpoint,
            action=action,
            after=metadata,
        )
        session.commit()
    except Exception as exc:
        logger.warning("Failed to write auth audit event: %s", exc)


def _enforce_auth_rate_limit(
    *,
    request: Request,
    endpoint_key: str,
    identity: str,
) -> None:
    rules = AUTH_RATE_LIMIT_RULES.get(endpoint_key)
    if not rules:
        return

    now = time.time()
    client_ip = _get_client_ip(request)

    with _rate_limit_lock:
        buckets_to_increment: list[deque[float]] = []

        for rule in rules:
            if rule.scope == "identity":
                if not identity:
                    continue
                bucket_key = f"{endpoint_key}:identity:{identity}"
            else:
                bucket_key = f"{endpoint_key}:ip:{client_ip}"

            bucket = _rate_limit_store.setdefault(bucket_key, deque())
            cutoff = now - rule.window_seconds
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= rule.max_attempts:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=AUTH_RATE_LIMIT_EXCEEDED_DETAIL,
                )

            buckets_to_increment.append(bucket)

        for bucket in buckets_to_increment:
            bucket.append(now)


@router.post("/login", response_model=Token)
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    device_id = request.headers.get("X-Device-ID")
    username = _normalize_identity(form_data.username)
    try:
        _enforce_auth_rate_limit(
            request=request,
            endpoint_key="login",
            identity=username,
        )
    except HTTPException:
        _safe_log_auth_event(
            session=session,
            request=request,
            endpoint="/api/auth/login",
            action="rate_limit_triggered",
            username=username,
            device_id=device_id,
        )
        raise

    user = auth_service.authenticate_user(session, form_data.username, form_data.password)
    if not user:
        _safe_log_auth_event(
            session=session,
            request=request,
            endpoint="/api/auth/login",
            action="login_failure",
            username=username,
            device_id=device_id,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Borrower accounts must use the Borrow portal (/borrow), not this login page
    if user.role and user.role.lower() in ("borrower", "brwr"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Borrower accounts cannot sign in here. Please use the Borrow portal instead.",
        )

    if auth_service.should_force_bootstrap_password_rotation(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=BOOTSTRAP_ROTATION_REQUIRED_DETAIL,
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    db_session = auth_service.create_user_session(
        session=session,
        user_uuid=user.id,
        expires_delta=access_token_expires,
        device_id=device_id,
    )

    access_token = auth_service.create_access_token(
        data={"sub": user.user_id, "session_id": db_session.session_id}, 
        expires_delta=access_token_expires
    )

    audit_service.log_action(
        db=session,
        entity_type="session",
        entity_id=db_session.session_id,
        action="login",
        actor_id=user.id
    )
    session.commit()

    return Token(access_token=access_token, token_type="bearer")


@router.post("/borrower/login", response_model=Token)
async def borrower_login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    device_id = request.headers.get("X-Device-ID")
    username = _normalize_identity(form_data.username)
    try:
        _enforce_auth_rate_limit(
            request=request,
            endpoint_key="borrower_login",
            identity=username,
        )
    except HTTPException:
        _safe_log_auth_event(
            session=session,
            request=request,
            endpoint="/api/auth/borrower/login",
            action="rate_limit_triggered",
            username=username,
            device_id=device_id,
        )
        raise

    user = auth_service.authenticate_user(session, form_data.username, form_data.password)
    if not user:
        _safe_log_auth_event(
            session=session,
            request=request,
            endpoint="/api/auth/borrower/login",
            action="login_failure",
            username=username,
            device_id=device_id,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect PIN",
        )

    if auth_service.should_force_bootstrap_password_rotation(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=BOOTSTRAP_ROTATION_REQUIRED_DETAIL,
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    if user.role == "borrower":
        db_session = auth_service.create_borrower_session(
            session=session,
            user_id=user.user_id,
            expires_delta=access_token_expires,
            user_uuid=user.id,
            device_id=device_id,
        )
    else:
        db_session = auth_service.create_user_session(
                session=session,
                user_uuid=user.id,
                expires_delta=access_token_expires,
                device_id=device_id,
            )

    access_token = auth_service.create_access_token(
        data={"sub": user.user_id, "session_id": db_session.session_id}, 
        expires_delta=access_token_expires
    )

    audit_service.log_action(
        db=session,
        entity_type="session",
        entity_id=db_session.session_id,
        action="login",
        actor_id=user.id
    )
    session.commit()

    return Token(access_token=access_token, token_type="bearer")


@router.post("/bootstrap/rotate-password", response_model=GenericResponse)
async def rotate_bootstrap_password(
    request: Request,
    payload: BootstrapPasswordRotateRequest,
    session: Session = Depends(get_session),
):
    if payload.new_password == payload.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password",
        )

    user = auth_service.authenticate_bootstrap_admin(
        session,
        payload.username,
        payload.current_password,
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bootstrap admin credentials",
        )

    auth_service.rotate_bootstrap_admin_password(session, user, payload.new_password)
    auth_service.revoke_sessions_for_user(session, user.id)

    audit_service.log_action(
        db=session,
        entity_type="user",
        entity_id=user.user_id,
        action="bootstrap_password_rotated",
        actor_id=user.id,
    )
    session.commit()

    return create_success_response(
        data=None,
        message="Bootstrap admin password rotated successfully",
        request=request,
    )


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


@router.post("/refresh", response_model=Token)
async def refresh_token(
    request: Request,
    session: Session = Depends(get_session),
    token: str = Depends(reusable_oauth2),
):
    try:
        # Decode token to get session_id and user payload
        payload = decode_access_token(token)
        session_id = payload.get("session_id")
        user_id = payload.get("sub")
        
        if not session_id or not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = auth_service.user_service.get(session, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        if user.role == "borrower":
            if not auth_service.is_borrower_session_valid(session, session_id):
                raise HTTPException(status_code=401, detail="Session expired or invalid")
            auth_service.extend_borrower_session(session, session_id, access_token_expires)
        else:
            if not auth_service.is_user_session_valid(session, session_id):
                raise HTTPException(status_code=401, detail="Session expired or invalid")
            auth_service.extend_user_session(session, session_id, access_token_expires)

        # Generate new token
        access_token = auth_service.create_access_token(
            data={"sub": user.user_id, "session_id": session_id}, 
            expires_delta=access_token_expires
        )
        
        return Token(access_token=access_token, token_type="bearer")
        
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/logout", response_model=GenericResponse)
async def logout(
    request: Request,
    session: Session = Depends(get_session),
    token: str = Depends(reusable_oauth2),
    _: None = Depends(require_permission("auth:session:manage")),
):
    try:
        # Decode token to get session_id and user role
        payload = decode_access_token(token)
        session_id = payload.get("session_id")
        user_id = payload.get("sub")
        
        user = auth_service.user_service.get(session, user_id)
        if user and session_id:
            if user.role == "borrower":
                auth_service.revoke_borrower_session(session, session_id)
            else:
                auth_service.revoke_user_session(session, session_id)

            audit_service.log_action(
                db=session,
                entity_type="session",
                entity_id=session_id,
                action="logout",
                actor_id=user.id
            )
            session.commit()
                
        return create_success_response(
            data=None,
            message="Successfully logged out",
            request=request
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
