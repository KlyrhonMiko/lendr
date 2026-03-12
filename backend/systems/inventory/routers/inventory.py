from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session
from core.database import get_session
from core.deps import get_current_user
from systems.inventory.services.inventory_service import InventoryService
from systems.inventory.schemas.inventory_schemas import InventoryItemCreate, InventoryItemRead, InventoryItemUpdate
from systems.inventory.models.user import User
from core.schemas import GenericResponse, create_success_response, PaginationMeta

router = APIRouter()
inventory_service = InventoryService()

@router.post("/items", response_model=GenericResponse[InventoryItemRead], status_code=201, responses={400: {"model": GenericResponse}, 401: {"model": GenericResponse}})
async def create_item(
    item_data: InventoryItemCreate, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    item = inventory_service.create(session, item_data)
    item_read = InventoryItemRead.model_validate(item)
    item_read.status_condition = inventory_service.get_item_status(session, item)
    return create_success_response(data=item_read, message="Item created successfully", request=request)

@router.get("/items", response_model=GenericResponse[list[InventoryItemRead]], responses={401: {"model": GenericResponse}})
async def list_items(
    request: Request,
    skip: int = 0, 
    limit: int = 100, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    items, total = inventory_service.get_all(session, skip=skip, limit=limit)
    items_read = []
    for item in items:
        item_read = InventoryItemRead.model_validate(item)
        item_read.status_condition = inventory_service.get_item_status(session, item)
        items_read.append(item_read)
    return create_success_response(
        data=items_read, 
        meta=PaginationMeta(total=total, limit=limit, offset=skip),
        request=request
    )

@router.get("/items/{item_id}", response_model=GenericResponse[InventoryItemRead], responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}})
async def get_item(
    item_id: str, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    item = inventory_service.get(session, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item_read = InventoryItemRead.model_validate(item)
    item_read.status_condition = inventory_service.get_item_status(session, item)
    return create_success_response(data=item_read, request=request)

@router.patch("/items/{item_id}", response_model=GenericResponse[InventoryItemRead], responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}})
async def update_item(
    item_id: str, 
    item_data: InventoryItemUpdate, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    item = inventory_service.get(session, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    updated_item = inventory_service.update(session, item, item_data)
    item_read = InventoryItemRead.model_validate(updated_item)
    item_read.status_condition = inventory_service.get_item_status(session, updated_item)
    return create_success_response(data=item_read, message="Item updated successfully", request=request)

@router.delete("/items/{item_id}", response_model=GenericResponse[InventoryItemRead], responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}})
async def delete_item(
    item_id: str, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    item = inventory_service.get(session, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    deleted_item = inventory_service.delete(session, item)
    item_read = InventoryItemRead.model_validate(deleted_item)
    item_read.status_condition = inventory_service.get_item_status(session, deleted_item)
    return create_success_response(data=item_read, message="Item deleted successfully", request=request)

@router.post("/items/{item_id}/restore", response_model=GenericResponse[InventoryItemRead], responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}})
async def restore_item(
    item_id: str, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    item = inventory_service.get(session, item_id, include_deleted=True)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    restored_item = inventory_service.restore(session, item)
    item_read = InventoryItemRead.model_validate(restored_item)
    item_read.status_condition = inventory_service.get_item_status(session, restored_item)
    return create_success_response(data=item_read, message="Item restored successfully", request=request)
