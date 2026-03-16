from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
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
from systems.inventory.schemas.inventory_unit_schemas import (
    InventoryUnitRead,
    InventoryUnitCreate,
    InventoryUnitBatchCreate,
    InventoryUnitUpdate,
)
from systems.inventory.schemas.inventory_movement_schemas import InventoryMovementRead
from systems.inventory.schemas.inventory_movement_schemas import (
    InventoryMovementAnomalyRead,
    InventoryMovementReconciliationRead,
    InventoryMovementReversalRead,
    InventoryMovementReversalRequest,
    InventoryMovementSummaryRead,
    InventoryMovementAdjust,
)
from systems.inventory.services.inventory_service import InventoryService
from systems.inventory.dependencies import shift_guard

from systems.auth.dependencies import require_permission

router = APIRouter()
inventory_service = InventoryService()


@router.post(
    "",
    response_model=GenericResponse[InventoryItemRead],
    status_code=201,
    responses={400: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def create_item(
    item_data: InventoryItemCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:items:manage")),
):
    item = inventory_service.create(
        session, 
        item_data,
        actor_id=current_user.id,
    )
    item_read = InventoryItemRead.model_validate(item)
    item_read.status_condition = inventory_service.get_item_status(session, item)

    return create_success_response(
        data=item_read, message="Item created successfully", request=request
    )


@router.get(
    "",
    response_model=GenericResponse[list[InventoryItemRead]],
    responses={401: {"model": GenericResponse}},
)
async def list_items(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:items:view")),
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
        request=request,
    )


@router.get(
    "/{item_id}",
    response_model=GenericResponse[InventoryItemRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def get_item(
    item_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:items:view")),
):
    item = inventory_service.get(session, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item_read = InventoryItemRead.model_validate(item)
    item_read.status_condition = inventory_service.get_item_status(session, item)

    return create_success_response(data=item_read, request=request)


@router.patch(
    "/{item_id}",
    response_model=GenericResponse[InventoryItemRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def update_item(
    item_id: str,
    item_data: InventoryItemUpdate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:items:manage")),
):
    item = inventory_service.get(session, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    updated_item = inventory_service.update(
        session, 
        item, 
        item_data,
        actor_id=current_user.id,
    )
    item_read = InventoryItemRead.model_validate(updated_item)
    item_read.status_condition = inventory_service.get_item_status(
        session, updated_item
    )

    return create_success_response(
        data=item_read, message="Item updated successfully", request=request
    )


@router.post(
    "/{item_id}/adjust-stock", response_model=GenericResponse[InventoryItemRead]
)
async def adjust_stock(
    item_id: str,
    payload: InventoryMovementAdjust,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:items:manage")),
):
    """
    Transactional stock adjustment.
    Use this for procurement, damage, or manual corrections.
    """
    try:
        item = inventory_service.adjust_stock(
            session,
            item_id,
            qty_change=payload.qty_change,
            movement_type=payload.movement_type,
            reason_code=payload.reason_code,
            reference_id=payload.reference_id,
            note=payload.note,
            actor_id=current_user.id,
        )
        session.commit()
        session.refresh(item)

        item_read = InventoryItemRead.model_validate(item)
        item_read.status_condition = inventory_service.get_item_status(session, item)

        return create_success_response(
            data=item_read,
            message=f"Stock successfully adjusted by {payload.qty_change}",
            request=request,
        )
    except ValueError as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete(
    "/{item_id}",
    response_model=GenericResponse[InventoryItemRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def delete_item(
    item_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:items:manage")),
):
    item = inventory_service.get(session, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    deleted_item = inventory_service.delete(
        session, 
        item,
        actor_id=current_user.id,
    )
    item_read = InventoryItemRead.model_validate(deleted_item)
    item_read.status_condition = inventory_service.get_item_status(
        session, deleted_item
    )

    return create_success_response(
        data=item_read, message="Item deleted successfully", request=request
    )


@router.post(
    "/{item_id}/restore",
    response_model=GenericResponse[InventoryItemRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def restore_item(
    item_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:items:manage")),
):
    item = inventory_service.get(session, item_id, include_deleted=True)
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if not item.is_deleted:
        raise HTTPException(
            status_code=400, 
            detail="Item is already active and does not need to be restored"
        )
        
    restored_item = inventory_service.restore(
        session, 
        item,
        actor_id=current_user.id,
    )
    item_read = InventoryItemRead.model_validate(restored_item)
    item_read.status_condition = inventory_service.get_item_status(
        session, restored_item
    )
    return create_success_response(
        data=item_read, message="Item restored successfully", request=request
    )


@router.get(
    "/movements/ledger", response_model=GenericResponse[list[InventoryMovementRead]]
)
async def get_all_movements_ledger(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    movement_type: Optional[str] = None,
    inventory_id: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:movements:view")),
):
    """Get the complete inventory movement ledger across all items with pagination and optional filters."""
    movements, total = inventory_service.get_all_movements(
        session,
        skip=skip,
        limit=limit,
        movement_type=movement_type,
        inventory_id=inventory_id,
    )

    return create_success_response(
        data=movements,
        meta=PaginationMeta(total=total, limit=limit, offset=skip),
        request=request,
    )


@router.get(
    "/{item_id}/movement-history", response_model=GenericResponse[list[InventoryMovementRead]]
)
async def get_item_history(
    item_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:movements:view")),
):
    """Get the stock movement ledger (history) for a specific inventory item."""
    history = inventory_service.get_history(session, item_id)

    return create_success_response(data=history, request=request)


@router.post(
    "/{item_id}/units",
    response_model=GenericResponse[InventoryUnitRead],
    status_code=201,
    responses={
        400: {"model": GenericResponse},
        401: {"model": GenericResponse},
        404: {"model": GenericResponse},
    },
)
async def create_unit(
    item_id: str,
    unit_data: InventoryUnitCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:units:manage")),
):
    """
    Create a single unit for a trackable inventory item.
    Item must exist and be marked as trackable (is_trackable=true).
    Serial number and internal_ref must be unique across all units.
    """
    try:
        unit = inventory_service.create_unit(
            session,
            item_id=item_id,
            serial_number=unit_data.serial_number,
            internal_ref=unit_data.internal_ref,
            expiration_date=unit_data.expiration_date,
            actor_id=current_user.id,
        )
        session.commit()
        session.refresh(unit)
        unit_read = InventoryUnitRead.model_validate(unit)

        return create_success_response(
            data=unit_read, message="Unit created successfully", request=request
        )
    except ValueError as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/{item_id}/units/batch",
    response_model=GenericResponse[list[InventoryUnitRead]],
    status_code=201,
    responses={
        400: {"model": GenericResponse},
        401: {"model": GenericResponse},
        404: {"model": GenericResponse},
    },
)
async def create_units_batch(
    item_id: str,
    batch_data: InventoryUnitBatchCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:units:manage")),
):
    """
    Batch create multiple units for a trackable inventory item.
    All units must be valid and unique. If any validation fails, the entire batch is rejected (atomic transaction).
    Maximum 500 units per batch.
    """
    try:
        units_list = [unit_data.model_dump() for unit_data in batch_data.units]
        created_units = inventory_service.create_units_batch(
            session,
            item_id=item_id,
            units_data=units_list,
            actor_id=current_user.id,
        )
        session.commit()
        for unit in created_units:
            session.refresh(unit)
        units_read = [InventoryUnitRead.model_validate(u) for u in created_units]

        return create_success_response(
            data=units_read,
            message=f"{len(units_read)} units created successfully",
            request=request,
        )
    except ValueError as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/{item_id}/units",
    response_model=GenericResponse[list[InventoryUnitRead]],
    responses={401: {"model": GenericResponse}},
)
async def list_item_units(
    item_id: str,
    request: Request,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    expiring_before: Optional[datetime] = None,
    include_expired: bool = True,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:units:view")),
):
    """
    Get all units for a specific inventory item with optional status filter and pagination.
    Status filter: 'available', 'borrowed', 'maintenance', 'retired'
    """
    units, total = inventory_service.get_units_by_status(
        session,
        item_id=item_id,
        status=status,
        expiring_before=expiring_before,
        include_expired=include_expired,
        skip=skip,
        limit=limit,
    )
    units_read = [InventoryUnitRead.model_validate(u) for u in units]

    return create_success_response(
        data=units_read,
        meta=PaginationMeta(total=total, limit=limit, offset=skip),
        request=request,
    )


@router.patch(
    "/{item_id}/units/{unit_id}",
    response_model=GenericResponse[InventoryUnitRead],
    responses={
        400: {"model": GenericResponse},
        401: {"model": GenericResponse},
        404: {"model": GenericResponse},
    },
)
async def update_unit(
    item_id: str,
    unit_id: str,
    unit_data: InventoryUnitUpdate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:units:manage")),
):
    """
    Update unit status and/or condition.
    Serial number and internal_ref are immutable and cannot be modified.
    Status values: 'available', 'borrowed', 'maintenance', 'retired'
    """
    try:
        unit = inventory_service.update_unit(
            session,
            unit_id=unit_id,
            status=unit_data.status,
            expiration_date=unit_data.expiration_date,
            condition=unit_data.condition,
            actor_id=current_user.id,
        )
        session.commit()
        session.refresh(unit)
        unit_read = InventoryUnitRead.model_validate(unit)

        return create_success_response(
            data=unit_read, message="Unit updated successfully", request=request
        )
    except ValueError as e:
        session.rollback()
        raise HTTPException(status_code=404, detail=str(e))


@router.delete(
    "/{item_id}/units/{unit_id}",
    response_model=GenericResponse[InventoryUnitRead],
    responses={
        400: {"model": GenericResponse},
        401: {"model": GenericResponse},
        404: {"model": GenericResponse},
    },
)
async def retire_unit(
    item_id: str,
    unit_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:units:manage")),
):
    """
    Retire (soft delete) a unit. Once retired, a unit cannot be borrowed or used.
    Retiring a unit is a permanent status change (status → 'retired').
    """
    try:
        unit = inventory_service.retire_unit(
            session,
            unit_id=unit_id,
            actor_id=current_user.id,
        )
        session.commit()
        session.refresh(unit)
        unit_read = InventoryUnitRead.model_validate(unit)

        return create_success_response(
            data=unit_read, message="Unit retired successfully", request=request
        )
    except ValueError as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/{item_id}/movements/reconcile",
    response_model=GenericResponse[InventoryMovementReconciliationRead],
    responses={400: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def reconcile_item_movements(
    item_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:movements:manage")),
):
    try:
        result = inventory_service.reconcile_movements(session, item_id)
        message = (
            "Inventory ledger reconciled"
            if result.is_reconciled
            else "Inventory ledger mismatch detected"
        )

        return create_success_response(data=result, message=message, request=request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/movements/{movement_id}/reverse",
    response_model=GenericResponse[InventoryMovementReversalRead],
    responses={
        400: {"model": GenericResponse},
        401: {"model": GenericResponse},
        404: {"model": GenericResponse},
    },
)
async def reverse_movement(
    movement_id: str,
    payload: InventoryMovementReversalRequest,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:movements:manage")),
):
    try:
        original = inventory_service.get_movement(session, movement_id)
        if not original:
            raise HTTPException(status_code=404, detail="Movement not found")

        reversal = inventory_service.reverse_movement(
            session,
            movement_id,
            reason=payload.reason,
            reason_code=payload.reason_code,
            actor_id=current_user.id,
        )
        session.commit()
        session.refresh(reversal)

        response = InventoryMovementReversalRead(
            original_movement_id=original.movement_id,
            reversal_movement_id=reversal.movement_id,
            original_qty_change=original.qty_change,
            reversal_qty_change=reversal.qty_change,
            reason=payload.reason,
            reason_code=reversal.reason_code,
            occurred_at=reversal.occurred_at,
        )

        return create_success_response(
            data=response,
            message="Movement reversed with compensating entry",
            request=request,
        )
    except ValueError as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        session.rollback()
        raise
    except Exception:
        session.rollback()
        raise


@router.get(
    "/{item_id}/movements/summary",
    response_model=GenericResponse[InventoryMovementSummaryRead],
    responses={400: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def get_item_movement_summary(
    item_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:movements:view")),
):
    try:
        summary = inventory_service.get_movements_summary(session, item_id)

        return create_success_response(data=summary, request=request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/movements/anomalies",
    response_model=GenericResponse[list[InventoryMovementAnomalyRead]],
    responses={401: {"model": GenericResponse}},
)
async def get_movement_anomalies(
    request: Request,
    severity: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:movements:view")),
):
    try:
        anomalies = inventory_service.get_movement_anomalies(
            session,
            severity=severity,
            skip=skip,
            limit=limit,
        )

        return create_success_response(
            data=anomalies,
            meta=PaginationMeta(total=len(anomalies), limit=limit, offset=skip),
            request=request,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
