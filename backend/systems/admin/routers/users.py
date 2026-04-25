from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlmodel import Session

from core.database import get_session
from core.deps import get_current_user
from systems.auth.dependencies import require_permission
from core.schemas import GenericResponse, create_success_response, make_pagination_meta
from systems.admin.models.user import User
from systems.admin.schemas.user_schemas import (
    GeneratedUserCredentialsRead,
    UserCreate,
    UserCreateResultRead,
    UserLoginPasswordResetRequest,
    UserLoginPasswordResetResultRead,
    UserRead,
    UserSecondaryPasswordRead,
    UserUpdate,
)
from systems.auth.schemas.auth_schemas import (
    TwoFactorCodeVerifyRequest,
    TwoFactorEnrollmentInitiateRead,
    TwoFactorStatusRead,
)
from systems.admin.services.user_service import UserService
from systems.auth.services.auth_service import auth_service
from systems.inventory.services.entrusted_item_service import EntrustedItemService
from systems.inventory.schemas.entrusted_item_schemas import EntrustedItemCreate, EntrustedItemRead, EntrustedItemRevoke

router = APIRouter()
user_service = UserService()
entrusted_service = EntrustedItemService()

TWO_FACTOR_BORROWER_FORBIDDEN_DETAIL = (
    "Borrower accounts are not eligible for two-factor enrollment or disable actions."
)


def _commit_and_refresh(session: Session, obj: User) -> None:
    """Commit and refresh when the provided session supports these operations."""
    commit = getattr(session, "commit", None)
    if callable(commit):
        commit()

    refresh = getattr(session, "refresh", None)
    if callable(refresh):
        refresh(obj)


def _ensure_two_factor_management_allowed(target_user: User) -> None:
    normalized_role = (target_user.role or "").strip().lower()
    if normalized_role in ("borrower", "brwr"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=TWO_FACTOR_BORROWER_FORBIDDEN_DETAIL,
        )


@router.post(
    "/register",
    response_model=GenericResponse[UserCreateResultRead],
    status_code=201,
    responses={400: {"model": GenericResponse}},
)
async def register_user(
    user_data: UserCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    user, generated_credentials = user_service.create_with_generated_credentials(
        session,
        user_data,
        actor_id=current_user.id,
    )
    _commit_and_refresh(session, user)

    generated_credentials_payload = None
    if generated_credentials:
        generated_credentials_payload = GeneratedUserCredentialsRead(
            one_time_login_password=generated_credentials["one_time_login_password"],
            secondary_password=generated_credentials["secondary_password"],
        )

    return create_success_response(
        data=UserCreateResultRead(
            user=UserRead.model_validate(user),
            generated_credentials=generated_credentials_payload,
        ),
        message="User registered successfully",
        request=request,
    )


@router.get(
    "",
    response_model=GenericResponse[list[UserRead]],
    responses={401: {"model": GenericResponse}},
)
async def list_users(
    request: Request,
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=500, description="Records per page"),
    search: Optional[str] = Query(default=None, description="Search by user ID, email, first name, or last name (case-insensitive)"),
    role: Optional[str] = Query(default=None, description="Filter by role (exact match, e.g. 'staff', 'admin')"),
    is_active: Optional[bool] = Query(default=None, description="Filter by active status (true=active, false=deactivated)"),
    shift_type: Optional[str] = Query(default=None, description="Filter by shift type (e.g. 'day', 'night')"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    skip = (page - 1) * per_page
    users, total = user_service.get_all(
        session,
        skip=skip,
        limit=per_page,
        search=search,
        role=role,
        is_active=is_active,
        shift_type=shift_type,
    )
    return create_success_response(
        data=users,
        meta=make_pagination_meta(total=total, skip=skip, limit=per_page, page=page, per_page=per_page),
        request=request,
    )




@router.get(
    "/{user_id}",
    response_model=GenericResponse[UserRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def get_user(
    user_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    user = user_service.get(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return create_success_response(data=user, request=request)


@router.get(
    "/{user_id}/secondary-password",
    response_model=GenericResponse[UserSecondaryPasswordRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
@router.get(
    "/{user_id}/recovery-credential",
    response_model=GenericResponse[UserSecondaryPasswordRead],
    include_in_schema=False,
)
async def get_user_secondary_password(
    user_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    user = user_service.get(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    secondary_password = user_service.get_secondary_password(
        session,
        user,
        actor_id=current_user.id,
    )
    _commit_and_refresh(session, user)

    return create_success_response(
        data=UserSecondaryPasswordRead(
            user_id=user.user_id,
            secondary_password=secondary_password,
            rotated_at=user.recovery_credential_rotated_at,
        ),
        message="Secondary password retrieved successfully",
        request=request,
    )


@router.post(
    "/{user_id}/reset-login-password",
    response_model=GenericResponse[UserLoginPasswordResetResultRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def reset_user_login_password(
    user_id: str,
    payload: UserLoginPasswordResetRequest,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    user = user_service.get(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_one_time_password, new_secondary_password = user_service.reset_login_password(
        session,
        user,
        secondary_password=payload.secondary_password,
        actor_id=current_user.id,
    )

    auth_service.revoke_sessions_for_user(session, user.id)
    _commit_and_refresh(session, user)

    return create_success_response(
        data=UserLoginPasswordResetResultRead(
            user_id=user.user_id,
            generated_credentials=GeneratedUserCredentialsRead(
                one_time_login_password=new_one_time_password,
                secondary_password=new_secondary_password,
            ),
            must_change_password=user.must_change_password,
        ),
        message="Login password reset successfully and secondary password rotated",
        request=request,
    )

@router.get(
    "/{user_id}/2fa/status",
    response_model=GenericResponse[TwoFactorStatusRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def get_user_two_factor_status_v1(
    user_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    target_user = user_service.get(session, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    enabled, enrolled_at = auth_service.get_two_factor_status(session, target_user.id)
    return create_success_response(
        data=TwoFactorStatusRead(
            enabled=enabled,
            method="authenticator_app",
            enrolled_at=enrolled_at,
        ),
        request=request,
    )

@router.post(
    "/{user_id}/2fa/enroll/initiate",
    response_model=GenericResponse[TwoFactorEnrollmentInitiateRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def initiate_user_two_factor_enrollment(
    user_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    target_user = user_service.get(session, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    _ensure_two_factor_management_allowed(target_user)

    try:
        enrollment = auth_service.begin_two_factor_enrollment(session, target_user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    session.commit()
    return create_success_response(
        data=TwoFactorEnrollmentInitiateRead(**enrollment),
        message="Two-factor enrollment initiated",
        request=request,
    )


@router.post(
    "/{user_id}/2fa/enroll/verify",
    response_model=GenericResponse[TwoFactorStatusRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def verify_user_two_factor_enrollment(
    user_id: str,
    payload: TwoFactorCodeVerifyRequest,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    target_user = user_service.get(session, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    _ensure_two_factor_management_allowed(target_user)

    try:
        verified, enrolled_at = auth_service.verify_two_factor_enrollment(
            session,
            target_user,
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



@router.post(
    "/{user_id}/2fa/reset",
    response_model=GenericResponse[TwoFactorStatusRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def reset_user_two_factor_enrollment(
    user_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    target_user = user_service.get(session, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    auth_service.reset_two_factor_enrollment_for_user(
        session,
        target_user,
        actor_id=current_user.id,
    )
    auth_service.revoke_sessions_for_user(session, target_user.id)
    session.commit()

    return create_success_response(
        data=TwoFactorStatusRead(
            enabled=False,
            method="authenticator_app",
            enrolled_at=None,
        ),
        message="Two-factor authentication reset successfully",
        request=request,
    )


@router.get(
    "/{user_id}/2fa/status",
    response_model=GenericResponse[TwoFactorStatusRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def get_user_two_factor_status(
    user_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    target_user = user_service.get(session, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    enabled, enrolled_at = auth_service.get_two_factor_status(session, target_user.id)

    return create_success_response(
        data=TwoFactorStatusRead(
            enabled=enabled,
            method="authenticator_app",
            enrolled_at=enrolled_at,
        ),
        request=request,
    )


@router.patch(
    "/{user_id}",
    response_model=GenericResponse[UserRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    user = user_service.get(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    should_revoke_sessions = user_service.requires_session_revocation(user, user_data)
    updated_user = user_service.update(
        session,
        user,
        user_data,
        actor_id=current_user.id,
    )

    message = "User updated successfully"
    if should_revoke_sessions:
        auth_service.revoke_sessions_for_user(session, updated_user.id)
        message = "User updated successfully. Active sessions were revoked for security."

    _commit_and_refresh(session, updated_user)

    return create_success_response(
        data=updated_user,
        message=message,
        request=request,
    )


@router.delete(
    "/{user_id}",
    response_model=GenericResponse[UserRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def delete_user(
    user_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    user = user_service.get(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    deleted_user = user_service.delete(session, user, actor_id=current_user.id)
    session.commit()
    session.refresh(deleted_user)

    return create_success_response(
        data=deleted_user, message="User deleted successfully", request=request
    )


@router.post(
    "/{user_id}/restore",
    response_model=GenericResponse[UserRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def restore_user(
    user_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    user = user_service.get(session, user_id, include_deleted=True)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    restored_user = user_service.restore(session, user, actor_id=current_user.id)
    session.commit()
    session.refresh(restored_user)

    return create_success_response(
        data=restored_user, message="User restored successfully", request=request
    )


@router.get("/entrusted-items/categories", response_model=dict[str, list[str]])
async def list_entrusted_categories(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    return entrusted_service.get_entrusted_categories(session)


@router.get(
    "/entrusted-items/all",
    response_model=GenericResponse[list[EntrustedItemRead]],
)
async def list_all_entrusted_items(
    request: Request,
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=500, description="Records per page"),
    search: Optional[str] = Query(default=None, description="Search by employee name, unit ID, serial number, or item name"),
    status: Optional[str] = Query(default=None, description="Filter by status (active, returned)"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    classification: Optional[str] = Query(default=None, description="Filter by classification"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    skip = (page - 1) * per_page
    items, total = entrusted_service.get_all_entrusted(
        session, 
        skip=skip, 
        limit=per_page, 
        search=search,
        status=status,
        category=category,
        classification=classification
    )
    return create_success_response(
        data=items,
        request=request,
        meta=make_pagination_meta(total=total, skip=skip, limit=per_page, page=page, per_page=per_page)
    )

@router.get(
    "/{user_id}/entrusted-items",
    response_model=GenericResponse[list[EntrustedItemRead]],
)
async def list_entrusted_items(
    user_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    items = entrusted_service.get_for_user(session, user_id)
    return create_success_response(data=items, request=request)

@router.post(
    "/{user_id}/entrusted-items",
    response_model=GenericResponse[EntrustedItemRead],
)
async def assign_entrusted_item(
    user_id: str,
    create_data: EntrustedItemCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    try:
        # verify the user_id in path matches the body, or just override
        if create_data.user_id != user_id:
            create_data.user_id = user_id
            
        item = entrusted_service.assign_item(session, create_data, actor_id=current_user.id)
        return create_success_response(data=item, message="Item entrusted successfully.", request=request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/{user_id}/entrusted-items/{assignment_id}/revoke",
    response_model=GenericResponse[EntrustedItemRead],
)
async def revoke_entrusted_item(
    user_id: str,
    assignment_id: str,
    revoke_data: EntrustedItemRevoke,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:users:manage")),
):
    try:
        item = entrusted_service.revoke_item(session, assignment_id, revoke_data, actor_id=current_user.id)
        return create_success_response(data=item, message="Assignment revoked successfully.", request=request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

