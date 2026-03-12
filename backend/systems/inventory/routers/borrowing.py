from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session
from core.database import get_session
from core.schemas import SuccessResponse, PaginationMeta, create_success_response
from systems.inventory.services.borrow_request_service import BorrowService
from systems.inventory.schemas.borrow_request_schemas import (
    BorrowRequestCreate, 
    BorrowRequestUpdate, 
    BorrowRequestRead,
    BorrowRequestApprove,
    BorrowRequestRelease,
    BorrowRequestReturn
)

router = APIRouter()
borrow_service = BorrowService()

@router.post("/requests", response_model=SuccessResponse[BorrowRequestRead], status_code=201)
async def create_request(request_data: BorrowRequestCreate, request: Request, session: Session = Depends(get_session)):
    # Default status and logic handled in service or schema
    borrow_request = borrow_service.create(session, request_data)
    return create_success_response(
        message="Borrow request created successfully",
        data=borrow_request,
        request=request
    )

@router.get("/requests", response_model=SuccessResponse[list[BorrowRequestRead]])
async def list_requests(request: Request, skip: int = 0, limit: int = 100, session: Session = Depends(get_session)):
    requests, total = borrow_service.get_all(session, skip=skip, limit=limit)
    return create_success_response(
        data=requests,
        meta=PaginationMeta(total=total, limit=limit, offset=skip),
        request=request
    )

@router.get("/requests/{borrow_id}", response_model=SuccessResponse[BorrowRequestRead])
async def get_request(borrow_id: str, request: Request, session: Session = Depends(get_session)):
    borrow_request = borrow_service.get(session, borrow_id)
    if not borrow_request:
        raise HTTPException(status_code=404, detail="Borrow request not found")
    return create_success_response(data=borrow_request, request=request)

@router.patch("/requests/{borrow_id}", response_model=SuccessResponse[BorrowRequestRead])
async def update_request(borrow_id: str, request_data: BorrowRequestUpdate, request: Request, session: Session = Depends(get_session)):
    db_request = borrow_service.get(session, borrow_id)
    if not db_request:
        raise HTTPException(status_code=404, detail="Borrow request not found")
    updated_request = borrow_service.update(session, db_request, request_data)
    return create_success_response(
        message="Borrow request updated successfully",
        data=updated_request,
        request=request
    )

@router.delete("/requests/{borrow_id}", response_model=SuccessResponse[None], status_code=200)
async def delete_request(borrow_id: str, request: Request, session: Session = Depends(get_session)):
    db_request = borrow_service.get(session, borrow_id)
    if not db_request:
        raise HTTPException(status_code=404, detail="Borrow request not found")
    borrow_service.delete(session, db_request)
    return create_success_response(message="Borrow request deleted successfully", data=None, request=request)

@router.post("/requests/{borrow_id}/restore", response_model=SuccessResponse[BorrowRequestRead])
async def restore_request(borrow_id: str, request: Request, session: Session = Depends(get_session)):
    db_request = borrow_service.get(session, borrow_id, include_deleted=True)

    if not db_request:
        raise HTTPException(status_code=404, detail="Borrow request not found")
    if not db_request.is_deleted:
        raise HTTPException(status_code=400, detail="Borrow request is not deleted")
    restored_request = borrow_service.restore(session, db_request)
    return create_success_response(message="Borrow request restored successfully", data=restored_request, request=request)

@router.post("/requests/{borrow_id}/approve", response_model=SuccessResponse[BorrowRequestRead])
async def approve_request(borrow_id: str, data: BorrowRequestApprove, request: Request, session: Session = Depends(get_session)):
    dummy_admin_id = UUID("00000000-0000-0000-0000-000000000000")
    
    updated_request = borrow_service.approve_request(session, borrow_id, dummy_admin_id, data)
    return create_success_response(
        message="Borrow request approved",
        data=updated_request,
        request=request
    )

@router.post("/requests/{borrow_id}/release", response_model=SuccessResponse[BorrowRequestRead])
async def release_request(borrow_id: str, data: BorrowRequestRelease, request: Request, session: Session = Depends(get_session)):
    dummy_admin_id = UUID("00000000-0000-0000-0000-000000000000")
    
    updated_request = borrow_service.release_request(session, borrow_id, dummy_admin_id, data)
    return create_success_response(
        message="Items released and inventory updated",
        data=updated_request,
        request=request
    )

@router.post("/requests/{borrow_id}/return", response_model=SuccessResponse[BorrowRequestRead])
async def return_request(borrow_id: str, data: BorrowRequestReturn, request: Request, session: Session = Depends(get_session)):
    updated_request = borrow_service.return_request(session, borrow_id, data)
    return create_success_response(
        message="Items returned and inventory updated",
        data=updated_request,
        request=request
    )
