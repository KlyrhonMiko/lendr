from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session
from core.database import get_session
from core.schemas import SuccessResponse, PaginationMeta, create_success_response
from systems.inventory.services.inventory_service import InventoryService
from systems.inventory.schemas.inventory_schemas import (
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryItemRead,
)

router = APIRouter()
inventory_service = InventoryService()


@router.post(
    "/items", response_model=SuccessResponse[InventoryItemRead], status_code=201
)
async def create_item(
    item_data: InventoryItemCreate,
    request: Request,
    session: Session = Depends(get_session),
):
    item = inventory_service.create(session, item_data)
    return create_success_response(
        message="Item created successfully", data=item, request=request
    )


@router.get("/items", response_model=SuccessResponse[list[InventoryItemRead]])
async def list_items(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
):
    items, total = inventory_service.get_all(session, skip=skip, limit=limit)
    return create_success_response(
        data=items,
        meta=PaginationMeta(total=total, limit=limit, offset=skip),
        request=request,
    )


@router.get("/items/{item_id}", response_model=SuccessResponse[InventoryItemRead])
async def get_item(
    item_id: str, request: Request, session: Session = Depends(get_session)
):
    item = inventory_service.get(session, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return create_success_response(data=item, request=request)


@router.patch("/items/{item_id}", response_model=SuccessResponse[InventoryItemRead])
async def update_item(
    item_id: str,
    item_data: InventoryItemUpdate,
    request: Request,
    session: Session = Depends(get_session),
):
    db_item = inventory_service.get(session, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    updated_item = inventory_service.update(session, db_item, item_data)
    return create_success_response(
        message="Item updated successfully", data=updated_item, request=request
    )


@router.delete(
    "/items/{item_id}", response_model=SuccessResponse[None], status_code=200
)
async def delete_item(
    item_id: str, request: Request, session: Session = Depends(get_session)
):
    db_item = inventory_service.get(session, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    inventory_service.delete(session, db_item)
    return create_success_response(
        message="Item deleted successfully", data=None, request=request
    )


@router.post(
    "/items/{item_id}/restore", response_model=SuccessResponse[InventoryItemRead]
)
async def restore_item(
    item_id: str, request: Request, session: Session = Depends(get_session)
):
    db_item = inventory_service.get(session, item_id, include_deleted=True)

    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    if not db_item.is_deleted:
        raise HTTPException(status_code=400, detail="Item is not deleted")
    restored_item = inventory_service.restore(session, db_item)
    return create_success_response(
        message="Item restored successfully", data=restored_item, request=request
    )
