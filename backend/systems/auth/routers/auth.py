from collections import deque
from datetime import timedelta
import hashlib
import re
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
from systems.admin.schemas.user_schemas import UserRead, UserUpdate
from systems.auth.dependencies import get_current_user, require_permission, reusable_oauth2
from systems.auth.schemas.auth_schemas import (
    FirstLoginPasswordRotateRequest,
    ForcedPasswordChangeRequiredRead,
    RolePolicyRead,
    SelfProfileUpdate,
    SessionPolicyRead,
    Token,
    TwoFactorChallengeRead,
    TwoFactorChallengeVerifyRequest,
    TwoFactorCodeVerifyRequest,
    TwoFactorDisableRequest,
    TwoFactorEnrollmentInitiateRead,
    TwoFactorStatusRead,
)
from systems.auth.services.auth_service import AuthService
from systems.auth.services.rbac_service import rbac_service
from utils.logging import get_logger
from utils.security import decode_access_token
from core.config import settings

router = APIRouter()
auth_service = AuthService()

FORCED_PASSWORD_CHANGE_CODE = "AUTH.FIRST_LOGIN_PASSWORD_CHANGE_REQUIRED"
FORCED_PASSWORD_CHANGE_DETAIL = "Password rotation is required before completing login."
FIRST_LOGIN_ROTATION_ENDPOINT = "/api/auth/first-login/rotate-password"
BORROWER_ONLY_LOGIN_DETAIL = "Borrower accounts only. Please use /api/auth/login."
AUTH_RATE_LIMIT_EXCEEDED_DETAIL = "Too many authentication attempts. Please try again later."
TWO_FACTOR_ENROLLMENT_REQUIRED_DETAIL = (
    "Two-factor authentication enrollment is required before login. "
    "Sign in to an existing session and complete authenticator setup first."
)
TWO_FACTOR_VERIFY_FAILED_DETAIL = "Invalid or expired two-factor challenge or authenticator code."
TWO_FACTOR_BORROWER_FORBIDDEN_DETAIL = (
    "Borrower accounts are not eligible for two-factor enrollment or disable actions."
)

# Restrict /api/auth/me to non-privileged self-service fields only.
SELF_UPDATE_ALLOWED_FIELDS = {
    "first_name",
    "last_name",
    "middle_name",
    "email",
    "contact_number",
    "username",
    "password",
    "current_password",
}


def _ensure_two_factor_account_management_allowed(user: User) -> None:
    normalized_role = (user.role or "").strip().lower()
    if normalized_role in ("borrower", "brwr"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=TWO_FACTOR_BORROWER_FORBIDDEN_DETAIL,
        )


@dataclass(frozen=True)
class RateLimitRule:
    scope: str
    max_attempts: int
    window_seconds: int


def _build_rate_limit_rules() -> dict[str, tuple[RateLimitRule, ...]]:
    auth_login_rules = (
        RateLimitRule(
            scope="ip",
            max_attempts=max(settings.AUTH_RATE_LIMIT_IP_MAX_ATTEMPTS, 1),
            window_seconds=max(settings.AUTH_RATE_LIMIT_IP_WINDOW_SECONDS, 1),
        ),
        RateLimitRule(
            scope="identity",
            max_attempts=max(settings.AUTH_RATE_LIMIT_IDENTITY_MAX_ATTEMPTS, 1),
            window_seconds=max(settings.AUTH_RATE_LIMIT_IDENTITY_WINDOW_SECONDS, 1),
        ),
    )

    return {
        "login": auth_login_rules,
        "borrower_login": auth_login_rules,
        "first_login_rotate_password": auth_login_rules,
    }

# Process-local limiter store. For multi-worker deployments, replace with shared storage.
_rate_limit_store: dict[str, deque[float]] = {}
_rate_limit_lock = threading.Lock()
logger = get_logger("auth")


def _cleanup_rate_limit_buckets_for_endpoint(
    *,
    endpoint_key: str,
    now: float,
    max_window_seconds: int,
) -> None:
    if max_window_seconds <= 0:
        return

    cutoff = now - max_window_seconds
    endpoint_prefix = f"{endpoint_key}:"
    stale_bucket_keys: list[str] = []

    for bucket_key, bucket in _rate_limit_store.items():
        if not bucket_key.startswith(endpoint_prefix):
            continue

        while bucket and bucket[0] <= cutoff:
            bucket.popleft()

        if not bucket:
            stale_bucket_keys.append(bucket_key)

    for bucket_key in stale_bucket_keys:
        _rate_limit_store.pop(bucket_key, None)


def _get_client_ip(request: Request) -> str:
    direct_client_ip = request.client.host if request.client and request.client.host else "unknown"

    if not settings.AUTH_TRUST_PROXY_HEADERS:
        return direct_client_ip

    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if not forwarded_for:
        return direct_client_ip

    forwarded_chain = [value.strip() for value in forwarded_for.split(",") if value.strip()]
    if not forwarded_chain:
        return direct_client_ip

    trusted_proxy_hops = max(settings.AUTH_TRUSTED_PROXY_HOPS, 1)
    originating_client_index = len(forwarded_chain) - trusted_proxy_hops - 1
    if originating_client_index < 0:
        return direct_client_ip

    return forwarded_chain[originating_client_index]


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
    extra_metadata: dict[str, int | str] | None = None,
) -> None:
    username_hash = _hash_value(username)
    metadata_payload: dict[str, str | int] = {
        "endpoint": endpoint,
        "username_hash": username_hash,
        "ip_hash": _hash_value(_get_client_ip(request)),
        "device_id_hash": _hash_value(device_id),
    }
    if extra_metadata:
        metadata_payload.update(extra_metadata)

    try:
        audit_service.log_action(
            db=session,
            entity_type="auth",
            entity_id=username_hash,
            action=action,
            after=metadata_payload,
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
    rules = _build_rate_limit_rules().get(endpoint_key)
    if not rules:
        return

    now = time.time()
    client_ip = _get_client_ip(request)

    with _rate_limit_lock:
        _cleanup_rate_limit_buckets_for_endpoint(
            endpoint_key=endpoint_key,
            now=now,
            max_window_seconds=max(rule.window_seconds for rule in rules),
        )
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


def _build_forced_password_change_response() -> ForcedPasswordChangeRequiredRead:
    return ForcedPasswordChangeRequiredRead(
        auth_state="password_change_required",
        code=FORCED_PASSWORD_CHANGE_CODE,
        detail=FORCED_PASSWORD_CHANGE_DETAIL,
        password_change_required=True,
        rotation_endpoint=FIRST_LOGIN_ROTATION_ENDPOINT,
    )


@router.post("/login", response_model=Token | TwoFactorChallengeRead | ForcedPasswordChangeRequiredRead)
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
    except HTTPException as exc:
        _safe_log_auth_event(
            session=session,
            request=request,
            endpoint="/api/auth/login",
            action="rate_limit_triggered",
            username=username,
            device_id=device_id,
            extra_metadata={"retry_after_seconds": int(exc.headers.get("Retry-After", "0"))}
            if exc.headers and exc.headers.get("Retry-After")
            else None,
        )
        raise

    auth_result = auth_service.authenticate_user_for_login(
        session,
        form_data.username,
        form_data.password,
    )
    if not auth_result:
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

    user, credential_mode = auth_result

    if credential_mode == "primary" and auth_service.should_force_first_login_password_rotation(user):
        return _build_forced_password_change_response()

    normalized_role = (user.role or "").strip().lower()
    if normalized_role not in ("borrower", "brwr") and auth_service.is_two_factor_required_for_user(
        session, user
    ):
        if not auth_service.has_active_two_factor_enrollment(session, user.id):
            audit_service.log_action(
                db=session,
                entity_type="auth_2fa",
                entity_id=user.user_id,
                action="two_factor_login_allowed_bootstrap_pending",
                actor_id=user.id,
            )

            if credential_mode == "secondary":
                auth_service.rotate_secondary_credential_after_login(
                    session,
                    user,
                    reason_code="login_two_factor_bootstrap_pending",
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
                expires_delta=access_token_expires,
            )

            audit_service.log_action(
                db=session,
                entity_type="session",
                entity_id=db_session.session_id,
                action="login",
                actor_id=user.id,
            )
            session.commit()

            return Token(access_token=access_token, token_type="bearer")

        challenge = auth_service.create_two_factor_login_challenge(
            session=session,
            user=user,
            device_id=device_id,
            used_secondary_password=credential_mode == "secondary",
        )
        session.commit()

        return TwoFactorChallengeRead(
            two_factor_required=True,
            challenge_token=challenge.challenge_id,
            challenge_expires_at=challenge.expires_at,
            method="authenticator_app",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    if credential_mode == "secondary":
        auth_service.rotate_secondary_credential_after_login(
            session,
            user,
            reason_code="login_completed",
        )

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


@router.post(
    "/2fa/enroll/initiate",
    response_model=GenericResponse[TwoFactorEnrollmentInitiateRead],
)
async def initiate_two_factor_enrollment(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _ensure_two_factor_account_management_allowed(current_user)

    try:
        enrollment = auth_service.begin_two_factor_enrollment(session, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    session.commit()
    return create_success_response(
        data=TwoFactorEnrollmentInitiateRead(**enrollment),
        message="Two-factor enrollment initiated",
        request=request,
    )


@router.post(
    "/2fa/enroll/verify",
    response_model=GenericResponse[TwoFactorStatusRead],
)
async def verify_two_factor_enrollment(
    payload: TwoFactorCodeVerifyRequest,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _ensure_two_factor_account_management_allowed(current_user)

    try:
        verified, enrolled_at = auth_service.verify_two_factor_enrollment(
            session,
            current_user,
            payload.code,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if not verified:
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticator code",
        )

    session.commit()
    return create_success_response(
        data=TwoFactorStatusRead(enabled=True, method="authenticator_app", enrolled_at=enrolled_at),
        message="Two-factor authentication enabled",
        request=request,
    )


@router.get(
    "/2fa/status",
    response_model=GenericResponse[TwoFactorStatusRead],
)
async def get_current_user_two_factor_status(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    enabled, enrolled_at = auth_service.get_two_factor_status(session, current_user.id)
    return create_success_response(
        data=TwoFactorStatusRead(
            enabled=enabled,
            method="authenticator_app",
            enrolled_at=enrolled_at,
        ),
        request=request,
    )


@router.post("/2fa/disable", response_model=GenericResponse[TwoFactorStatusRead])
async def disable_two_factor_enrollment(
    payload: TwoFactorDisableRequest,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _ensure_two_factor_account_management_allowed(current_user)

    try:
        disabled, _ = auth_service.disable_two_factor_enrollment(session, current_user, payload.code)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if not disabled:
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticator code",
        )

    session.commit()
    return create_success_response(
        data=TwoFactorStatusRead(enabled=False, method="authenticator_app", enrolled_at=None),
        message="Two-factor authentication disabled",
        request=request,
    )


@router.get(
    "/2fa/status",
    response_model=GenericResponse[TwoFactorStatusRead],
    responses={401: {"model": GenericResponse}},
)
async def get_two_factor_status(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    enabled, enrolled_at = auth_service.get_two_factor_status(session, current_user.id)

    return create_success_response(
        data=TwoFactorStatusRead(
            enabled=enabled,
            method="authenticator_app",
            enrolled_at=enrolled_at,
        ),
        request=request,
    )


@router.post("/2fa/verify", response_model=Token)
async def verify_two_factor_login_challenge(
    payload: TwoFactorChallengeVerifyRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    verification_result = auth_service.verify_two_factor_login_challenge(
        session,
        payload.challenge_token,
        payload.code,
        access_token_expires,
    )

    if not verification_result:
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=TWO_FACTOR_VERIFY_FAILED_DETAIL,
        )

    access_token, session_id, actor_id = verification_result
    audit_service.log_action(
        db=session,
        entity_type="session",
        entity_id=session_id,
        action="login",
        actor_id=actor_id,
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
    except HTTPException as exc:
        _safe_log_auth_event(
            session=session,
            request=request,
            endpoint="/api/auth/borrower/login",
            action="rate_limit_triggered",
            username=username,
            device_id=device_id,
            extra_metadata={"retry_after_seconds": int(exc.headers.get("Retry-After", "0"))}
            if exc.headers and exc.headers.get("Retry-After")
            else None,
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

    if not auth_service.is_borrower_role(user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=BORROWER_ONLY_LOGIN_DETAIL,
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    db_session = auth_service.create_borrower_session(
        session=session,
        user_id=user.user_id,
        expires_delta=access_token_expires,
        user_uuid=user.id,
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


async def _rotate_first_login_password(
    request: Request,
    payload: FirstLoginPasswordRotateRequest,
    session: Session,
    success_message: str = "Initial password rotated successfully",
):
    device_id = request.headers.get("X-Device-ID")
    username = _normalize_identity(payload.username)
    try:
        _enforce_auth_rate_limit(
            request=request,
            endpoint_key="first_login_rotate_password",
            identity=username,
        )
    except HTTPException as exc:
        _safe_log_auth_event(
            session=session,
            request=request,
            endpoint=FIRST_LOGIN_ROTATION_ENDPOINT,
            action="rate_limit_triggered",
            username=username,
            device_id=device_id,
            extra_metadata={"retry_after_seconds": int(exc.headers.get("Retry-After", "0"))}
            if exc.headers and exc.headers.get("Retry-After")
            else None,
        )
        raise

    if payload.new_password == payload.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password",
        )

    try:
        auth_result = auth_service.authenticate_first_login_rotation_user_with_mode(
            session,
            payload.username,
            payload.current_password,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    if not auth_result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials for first-login password rotation",
        )

    user, credential_mode = auth_result

    try:
        auth_service.rotate_first_login_password(
            session,
            user,
            payload.new_password,
            used_secondary_password=credential_mode == "secondary",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # Revoke any pre-existing sessions to guarantee clean post-rotation auth state.
    auth_service.revoke_sessions_for_user(session, user.id)

    audit_service.log_action(
        db=session,
        entity_type="user",
        entity_id=user.user_id,
        action="first_login_password_rotated",
        actor_id=user.id,
    )
    session.commit()

    return create_success_response(
        data=None,
        message=success_message,
        request=request,
    )


@router.post("/first-login/rotate-password", response_model=GenericResponse)
async def rotate_first_login_password(
    request: Request,
    payload: FirstLoginPasswordRotateRequest,
    session: Session = Depends(get_session),
):
    return await _rotate_first_login_password(
        request=request,
        payload=payload,
        session=session,
        success_message="Initial password rotated successfully",
    )


@router.get("/me", response_model=GenericResponse[UserRead], responses={401: {"model": GenericResponse}})
async def read_users_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("auth:session:manage")),
):

    return create_success_response(data=current_user, request=request)


@router.patch("/me", response_model=GenericResponse[UserRead], responses={401: {"model": GenericResponse}})
async def update_users_me(
    user_data: SelfProfileUpdate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    token: str = Depends(reusable_oauth2),
    _: None = Depends(require_permission("auth:session:manage")),
):
    from systems.admin.services.user_service import UserService
    user_service = UserService()

    incoming_updates = user_data.model_dump(exclude_unset=True)
    disallowed_fields = sorted(set(incoming_updates) - SELF_UPDATE_ALLOWED_FIELDS)
    if disallowed_fields:
        blocked_fields = ", ".join(disallowed_fields)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Self-service profile update cannot modify: {blocked_fields}",
        )

    sanitized_user_data = UserUpdate(**incoming_updates)

    sensitive_fields_changed = bool(sanitized_user_data.password)
    if sanitized_user_data.email is not None and sanitized_user_data.email != current_user.email:
        sensitive_fields_changed = True
    if sanitized_user_data.username is not None and sanitized_user_data.username != current_user.username:
        sensitive_fields_changed = True

    if sensitive_fields_changed and not sanitized_user_data.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is required to change password, email, or username",
        )

    if sanitized_user_data.password:
        sanitized_user_data = sanitized_user_data.model_copy(update={"change_password": True})
        if auth_service.is_borrower_role(current_user.role) and not re.fullmatch(r"\d{6}", sanitized_user_data.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Borrower password must be exactly 6 numeric digits",
            )

    if sensitive_fields_changed:
        from utils.security import verify_and_update_password

        current_password = sanitized_user_data.current_password
        if current_password is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to change password, email, or username",
            )

        verified, _upgraded_hash = verify_and_update_password(
            current_password,
            current_user.hashed_password,
        )
        if not verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password",
            )

    try:
        token_payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    current_session_id = token_payload.get("session_id")
    if not current_session_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    should_revoke_sessions = user_service.requires_session_revocation(current_user, sanitized_user_data)
    updated_user = user_service.update(
        session,
        current_user,
        sanitized_user_data,
        actor_id=current_user.id,
    )

    message = "Profile updated successfully"
    if should_revoke_sessions:
        auth_service.revoke_other_sessions_for_user(
            session,
            updated_user.id,
            keep_session_id=current_session_id,
        )
        message = "Profile updated successfully. Other active sessions were revoked for security."

    session.commit()
    session.refresh(updated_user)

    return create_success_response(
        data=updated_user,
        message=message,
        request=request,
    )


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


@router.get(
    "/session-policy",
    response_model=GenericResponse[SessionPolicyRead],
    responses={401: {"model": GenericResponse}},
)
async def get_session_policy(
    request: Request,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
):
    policy = auth_service.get_session_timeout_policy(session)

    return create_success_response(
        data=SessionPolicyRead(**policy),
        request=request,
    )


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
        
        # Session source is determined by the issued session id prefix,
        # so borrower-role users can refresh both standard (USE-*) and
        # borrower-portal (BSE-*) login tokens.
        if str(session_id).startswith("BSE-"):
            if not auth_service.is_borrower_session_valid(session, session_id):
                raise HTTPException(status_code=401, detail="Session expired or invalid")
            auth_service.extend_borrower_session(session, session_id, access_token_expires)
        else:
            if not auth_service.is_user_session_valid(session, session_id):
                raise HTTPException(status_code=401, detail="Session expired or invalid")
            auth_service.extend_user_session(session, session_id, access_token_expires)

        session.commit()

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
    current_user: User = Depends(get_current_user),
):
    try:
        # Decode token and revoke the exact server-side session by id.
        payload = decode_access_token(token)
        session_id = payload.get("session_id")
        if session_id and auth_service.revoke_session_by_id(session, session_id):
            audit_service.log_action(
                db=session,
                entity_type="session",
                entity_id=session_id,
                action="logout",
                actor_id=current_user.id,
            )
            session.commit()
                
        return create_success_response(
            data=None,
            message="Successfully logged out",
            request=request
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
