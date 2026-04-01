from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session

from core.database import get_session
from core.deps import get_current_user
from systems.auth.dependencies import require_permission
from core.schemas import GenericResponse, create_success_response, make_pagination_meta
from systems.admin.models.user import User
from systems.admin.schemas.user_schemas import UserCreate, UserRead, UserUpdate
from systems.admin.services.user_service import UserService

router = APIRouter()
user_service = UserService()


@router.post(
    "/register",
    response_model=GenericResponse[UserRead],
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
    user = user_service.create(session, user_data)
    return create_success_response(
        data=user, message="User registered successfully", request=request
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
    updated_user = user_service.update(session, user, user_data)
    return create_success_response(
        data=updated_user, message="User updated successfully", request=request
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
    deleted_user = user_service.delete(session, user)
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
    restored_user = user_service.restore(session, user)
    session.commit()
    session.refresh(restored_user)

    return create_success_response(
        data=restored_user, message="User restored successfully", request=request
    )
