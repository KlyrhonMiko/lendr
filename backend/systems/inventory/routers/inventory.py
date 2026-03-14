from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from core.database import get_session
from core.deps import get_current_user
from core.schemas import GenericResponse, PaginationMeta, create_success_response
from systems.admin.models.user import User
from systems.inventory.schemas.inventory_schemas import (
    InventoryItemCreate,
    InventoryItemRead,
    InventoryItemUpdate,
)
from systems.inventory.schemas.inventory_unit_schemas import InventoryUnitRead
from systems.inventory.schemas.inventory_movement_schemas import InventoryMovementRead
from systems.inventory.services.inventory_service import InventoryService
from systems.inventory.dependencies import shift_guard

router = APIRouter()
inventory_service = InventoryService()

@router.post("", response_model=GenericResponse[InventoryItemRead], status_code=201, responses={400: {"model": GenericResponse}, 401: {"model": GenericResponse}})
async def create_item(
    item_data: InventoryItemCreate, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard)
):
    item = inventory_service.create(session, item_data)
    item_read = InventoryItemRead.model_validate(item)
    item_read.status_condition = inventory_service.get_item_status(session, item)
    return create_success_response(data=item_read, message="Item created successfully", request=request)

@router.get("", response_model=GenericResponse[list[InventoryItemRead]], responses={401: {"model": GenericResponse}})
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

@router.get("/{item_id}", response_model=GenericResponse[InventoryItemRead], responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}})
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

@router.patch("/{item_id}", response_model=GenericResponse[InventoryItemRead], responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}})
async def update_item(
    item_id: str, 
    item_data: InventoryItemUpdate, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard)
):
    item = inventory_service.get(session, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    updated_item = inventory_service.update(session, item, item_data)
    item_read = InventoryItemRead.model_validate(updated_item)
    item_read.status_condition = inventory_service.get_item_status(session, updated_item)
    return create_success_response(data=item_read, message="Item updated successfully", request=request)

@router.post("/{item_id}/adjust-stock", response_model=GenericResponse[InventoryItemRead])
async def adjust_stock(
    item_id: str,
    qty_change: int,
    request: Request,
    note: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard) # Protected by shift guard
):
    """
    Transactional stock adjustment. 
    Use this for procurement, damage, or manual corrections.
    """
    item = inventory_service.adjust_stock(session, item_id, qty_change, note=note)
    
    item_read = InventoryItemRead.model_validate(item)
    item_read.status_condition = inventory_service.get_item_status(session, item)
    
    return create_success_response(
        data=item_read, 
        message=f"Stock successfully adjusted by {qty_change}", 
        request=request
    )

@router.delete("/{item_id}", response_model=GenericResponse[InventoryItemRead], responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}})
async def delete_item(
    item_id: str, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard)
):
    item = inventory_service.get(session, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    deleted_item = inventory_service.delete(session, item)
    item_read = InventoryItemRead.model_validate(deleted_item)
    item_read.status_condition = inventory_service.get_item_status(session, deleted_item)
    return create_success_response(data=item_read, message="Item deleted successfully", request=request)

@router.post("/{item_id}/restore", response_model=GenericResponse[InventoryItemRead], responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}})
async def restore_item(
    item_id: str, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard)
):
    item = inventory_service.get(session, item_id, include_deleted=True)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    restored_item = inventory_service.restore(session, item)
    item_read = InventoryItemRead.model_validate(restored_item)
    item_read.status_condition = inventory_service.get_item_status(session, restored_item)
    return create_success_response(data=item_read, message="Item restored successfully", request=request)

@router.get("/{item_id}/units", response_model=GenericResponse[list[InventoryUnitRead]])
async def get_item_units(
    item_id: str, 
    request: Request,
    session: Session = Depends(get_session)
):
    """Get all individual units/serial numbers for a specific inventory item."""
    units = inventory_service.get_units(session, item_id)
    return create_success_response(data=units, request=request)

@router.get("/{item_id}/history", response_model=GenericResponse[list[InventoryMovementRead]])
async def get_item_history(
    item_id: str, 
    request: Request, 
    session: Session = Depends(get_session)
):
    """Get the stock movement ledger (history) for a specific inventory item."""
    history = inventory_service.get_history(session, item_id)
    return create_success_response(data=history, request=request)

