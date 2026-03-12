from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session
from core.database import get_session
from core.schemas import SuccessResponse, PaginationMeta, create_success_response
from systems.inventory.services.user_service import UserService
from systems.inventory.schemas.user_schemas import UserCreate, UserUpdate, UserRead

router = APIRouter()
user_service = UserService()

@router.post("/register", response_model=SuccessResponse[UserRead], status_code=201)
async def register_user(user_data: UserCreate, request: Request, session: Session = Depends(get_session)):
    user = user_service.create(session, user_data)
    return create_success_response(
        message="User registered successfully",
        data=user,
        request=request
    )

@router.get("/users", response_model=SuccessResponse[list[UserRead]])
async def list_users(request: Request, skip: int = 0, limit: int = 100, session: Session = Depends(get_session)):
    users, total = user_service.get_all(session, skip=skip, limit=limit)
    return create_success_response(
        data=users,
        meta=PaginationMeta(total=total, limit=limit, offset=skip),
        request=request
    )

@router.get("/users/{user_id}", response_model=SuccessResponse[UserRead])
async def get_user(user_id: str, request: Request, session: Session = Depends(get_session)):
    user = user_service.get(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return create_success_response(data=user, request=request)

@router.patch("/users/{user_id}", response_model=SuccessResponse[UserRead])
async def update_user(user_id: str, user_data: UserUpdate, request: Request, session: Session = Depends(get_session)):
    db_user = user_service.get(session, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    updated_user = user_service.update(session, db_user, user_data)
    return create_success_response(
        message="User updated successfully",
        data=updated_user,
        request=request
    )

@router.delete("/users/{user_id}", response_model=SuccessResponse[None], status_code=200)
async def delete_user(user_id: str, request: Request, session: Session = Depends(get_session)):
    db_user = user_service.get(session, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    user_service.delete(session, db_user)
    return create_success_response(message="User deleted successfully", data=None, request=request)

@router.post("/users/{user_id}/restore", response_model=SuccessResponse[UserRead])
async def restore_user(user_id: str, request: Request, session: Session = Depends(get_session)):
    db_user = user_service.get(session, user_id, include_deleted=True)

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if not db_user.is_deleted:
        raise HTTPException(status_code=400, detail="User is not deleted")
    restored_user = user_service.restore(session, db_user)
    return create_success_response(message="User restored successfully", data=restored_user, request=request)
