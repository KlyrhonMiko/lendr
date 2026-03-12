from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session
from core.database import get_session
from core.deps import get_current_user
from systems.inventory.services.user_service import UserService
from systems.inventory.schemas.user_schemas import UserCreate, UserRead, UserUpdate
from systems.inventory.models.user import User
from core.schemas import GenericResponse, create_success_response, PaginationMeta

router = APIRouter()
user_service = UserService()

@router.post("/register", response_model=GenericResponse[UserRead], status_code=201, responses={400: {"model": GenericResponse}})
async def register_user(
    user_data: UserCreate, 
    request: Request,
    session: Session = Depends(get_session)
):
    user = user_service.create(session, user_data)
    return create_success_response(data=user, message="User registered successfully", request=request)

@router.get("", response_model=GenericResponse[list[UserRead]], responses={401: {"model": GenericResponse}})
async def list_users(
    request: Request,
    skip: int = 0, 
    limit: int = 100, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    users, total = user_service.get_all(session, skip=skip, limit=limit)
    return create_success_response(
        data=users, 
        meta=PaginationMeta(total=total, limit=limit, offset=skip),
        request=request
    )

@router.get("/{user_id}", response_model=GenericResponse[UserRead], responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}})
async def get_user(
    user_id: str, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = user_service.get(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return create_success_response(data=user, request=request)

@router.patch("/{user_id}", response_model=GenericResponse[UserRead], responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}})
async def update_user(
    user_id: str, 
    user_data: UserUpdate, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = user_service.get(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updated_user = user_service.update(session, user, user_data)
    return create_success_response(data=updated_user, message="User updated successfully", request=request)

@router.delete("/{user_id}", response_model=GenericResponse[UserRead], responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}})
async def delete_user(
    user_id: str, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = user_service.get(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    deleted_user = user_service.delete(session, user)
    return create_success_response(data=deleted_user, message="User deleted successfully", request=request)

@router.post("/{user_id}/restore", response_model=GenericResponse[UserRead], responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}})
async def restore_user(
    user_id: str, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = user_service.get(session, user_id, include_deleted=True)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    restored_user = user_service.restore(session, user)
    return create_success_response(data=restored_user, message="User restored successfully", request=request)
