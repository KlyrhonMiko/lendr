from datetime import datetime
from typing import Optional
from systems.inventory.schemas.warehouse_approval_schemas import WarehouseApprovalRead
from systems.inventory.schemas.borrow_request_schemas import BorrowRequestEventRead
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session

from core.database import get_session
from core.deps import get_current_user
from core.schemas import GenericResponse, create_success_response, make_pagination_meta
from systems.admin.models.user import User
from systems.inventory.schemas.borrow_request_schemas import (
    BorrowRequestApprove,
    BorrowRequestAutoRouteWarehouse,
    BorrowRequestCreate,
    BorrowRequestUnitAssign,
    BorrowRequestUnitRead,
    BorrowRequestReject,
    BorrowRequestRead,
    BorrowRequestReopen,
    BorrowRequestRelease,
    BorrowRequestSendToWarehouse,
    BorrowRequestReturn,
    BorrowRequestWarehouseApprove,
    BorrowRequestWarehouseApproveWithProvision,
)
from systems.inventory.dependencies import shift_guard
from systems.inventory.services.borrow_request_service import BorrowService
from systems.auth.dependencies import require_permission

router = APIRouter()
borrow_service = BorrowService()


@router.post(
    "/requests",
    response_model=GenericResponse[BorrowRequestRead],
    status_code=201,
    responses={400: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def create_request(
    request_data: BorrowRequestCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:borrow_requests:manage")),
):
    try:
        borrow_req = borrow_service.create_request(
            session,
            request_data,
            borrower_id=current_user.user_id,
            request_channel="inventory_manager",
            actor_id=current_user.id,
        )
        return create_success_response(
            data=borrow_service.serialize_borrow_request(session, borrow_req),
            message="Borrow request created",
            request=request,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/requests",
    response_model=GenericResponse[list[BorrowRequestRead]],
    responses={401: {"model": GenericResponse}},
)
async def list_requests(
    request: Request,
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=500, description="Records per page"),
    status: Optional[str] = Query(default=None, description="Filter by status (pending, approved, released, returned, rejected, etc.)"),
    request_channel: Optional[str] = Query(default=None, description="Filter by request channel (inventory_manager, borrower_portal)"),
    is_emergency: Optional[bool] = Query(default=None, description="Filter by emergency flag"),
    borrower_id: Optional[str] = Query(default=None, description="Filter by borrower user ID (e.g. ST-001)"),
    returned_on_time: Optional[bool] = Query(default=None, description="Filter by on-time return status"),
    date_from: Optional[datetime] = Query(default=None, description="Filter requests from this date (inclusive)"),
    date_to: Optional[datetime] = Query(default=None, description="Filter requests up to this date (inclusive)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:borrow_requests:manage")),
):
    skip = (page - 1) * per_page
    requests, total = borrow_service.get_all(
        session,
        skip=skip,
        limit=per_page,
        status=status,
        request_channel=request_channel,
        is_emergency=is_emergency,
        borrower_id=borrower_id,
        returned_on_time=returned_on_time,
        date_from=date_from,
        date_to=date_to,
    )
    serialized = borrow_service.serialize_borrow_requests(session, requests)
    return create_success_response(
        data=serialized,
        meta=make_pagination_meta(total=total, skip=skip, limit=per_page, page=page, per_page=per_page),
        request=request,
    )


@router.post(
    "/requests/{request_id}/approve",
    response_model=GenericResponse[BorrowRequestRead],
    responses={
        404: {"model": GenericResponse},
        400: {"model": GenericResponse},
        401: {"model": GenericResponse},
    },
)
async def approve_request(
    request_id: str,
    payload: BorrowRequestApprove,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:borrow_requests:manage")),
):
    try:
        updated_req = borrow_service.approve_request(
            session,
            request_id,
            current_user.id,
            note=payload.notes,
            auto_route_shortage=payload.auto_route_shortage,
        )
        return create_success_response(
            data=borrow_service.serialize_borrow_request(session, updated_req),
            message="Request approved",
            request=request,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/requests/{request_id}/reject",
    response_model=GenericResponse[BorrowRequestRead],
    responses={
        404: {"model": GenericResponse},
        400: {"model": GenericResponse},
        401: {"model": GenericResponse},
    },
)
async def reject_request(
    request_id: str,
    payload: BorrowRequestReject,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:borrow_requests:manage")),
):
    try:
        updated_req = borrow_service.reject_request(
            session,
            request_id,
            current_user.id,
            note=payload.notes,
        )
        return create_success_response(
            data=borrow_service.serialize_borrow_request(session, updated_req),
            message="Request rejected",
            request=request,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/requests/{request_id}/release",
    response_model=GenericResponse[BorrowRequestRead],
    responses={
        404: {"model": GenericResponse},
        400: {"model": GenericResponse},
        401: {"model": GenericResponse},
    },
)
async def release_request(
    request_id: str,
    payload: BorrowRequestRelease,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:borrow_requests:manage")),
):
    try:
        updated_req = borrow_service.release_request(
            session,
            request_id,
            current_user.id,
            note=payload.notes,
        )
        return create_success_response(
            data=borrow_service.serialize_borrow_request(session, updated_req),
            message="Request released",
            request=request,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch(
    "/requests/{request_id}/assign-units",
    response_model=GenericResponse[list[BorrowRequestUnitRead]],
    responses={
        404: {"model": GenericResponse},
        400: {"model": GenericResponse},
        401: {"model": GenericResponse},
    },
)
async def assign_units_to_request(
    request_id: str,
    payload: BorrowRequestUnitAssign,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:borrow_requests:manage")),
):
    try:
        assignments = borrow_service.assign_units(
            session,
            request_id=request_id,
            unit_ids=payload.unit_ids,
            actor_id=current_user.id,
            item_id=payload.item_id,
            note=payload.notes,
        )
        return create_success_response(
            data=assignments, message="Units assigned to request", request=request
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/requests/{request_id}/units",
    response_model=GenericResponse[list[BorrowRequestUnitRead]],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def get_assigned_units(
    request_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:borrow_requests:manage")),
):
    borrow_req = borrow_service.get(session, request_id)
    if not borrow_req:
        raise HTTPException(status_code=404, detail="Request not found")

    units = borrow_service.get_assigned_units(session, request_id)
    return create_success_response(data=units, request=request)


@router.post(
    "/requests/{request_id}/return",
    response_model=GenericResponse[BorrowRequestRead],
    responses={
        404: {"model": GenericResponse},
        400: {"model": GenericResponse},
        401: {"model": GenericResponse},
    },
)
async def return_request(
    request_id: str,
    payload: BorrowRequestReturn,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:borrow_requests:manage")),
):
    try:
        updated_req = borrow_service.return_request(
            session,
            request_id,
            actor_id=current_user.id,
            note=payload.notes,
            unit_returns=payload.unit_returns,
        )
        return create_success_response(
            data=borrow_service.serialize_borrow_request(session, updated_req),
            message="Request returned",
            request=request,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/requests/{request_id}/reopen",
    response_model=GenericResponse[BorrowRequestRead],
    responses={
        404: {"model": GenericResponse},
        400: {"model": GenericResponse},
        401: {"model": GenericResponse},
    },
)
async def reopen_request(
    request_id: str,
    payload: BorrowRequestReopen,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:borrow_requests:manage")),
):
    try:
        updated_req = borrow_service.reopen_request(
            session,
            request_id,
            actor_id=current_user.id,
            note=payload.notes,
        )
        return create_success_response(
            data=borrow_service.serialize_borrow_request(session, updated_req),
            message="Request reopened",
            request=request,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/requests/{request_id}",
    response_model=GenericResponse[BorrowRequestRead],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def get_request(
    request_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:borrow_requests:manage")),
):
    # The service 'get' method already handles the lookup
    borrow_req = borrow_service.get(session, request_id)
    if not borrow_req:
        raise HTTPException(status_code=404, detail="Request not found")
    return create_success_response(
        data=borrow_service.serialize_borrow_request(session, borrow_req),
        request=request,
    )


@router.get(
    "/requests/{request_id}/events",
    response_model=GenericResponse[list[BorrowRequestEventRead]],
    responses={404: {"model": GenericResponse}, 401: {"model": GenericResponse}},
)
async def get_request_events(
    request_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:borrow_requests:manage")),
):
    borrow_req = borrow_service.get(session, request_id)
    if not borrow_req:
        raise HTTPException(status_code=404, detail="Request not found")

    events = borrow_service.serialize_borrow_events(session, borrow_req.events or [])
    return create_success_response(data=events, request=request)


@router.post(
    "/requests/{request_id}/send-to-warehouse",
    response_model=GenericResponse[BorrowRequestRead],
)
async def send_to_warehouse(
    request_id: str,
    payload: BorrowRequestSendToWarehouse,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:warehouse:manage")),
):
    try:
        updated_req = borrow_service.send_to_warehouse(
            session,
            request_id,
            current_user.id,
            note=payload.notes,
        )
        return create_success_response(
            data=borrow_service.serialize_borrow_request(session, updated_req),
            message="Sent to warehouse",
            request=request,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch(
    "/requests/{request_id}/auto-route-warehouse",
    response_model=GenericResponse[BorrowRequestRead],
)
async def auto_route_warehouse(
    request_id: str,
    payload: BorrowRequestAutoRouteWarehouse,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:warehouse:manage")),
):
    try:
        updated_req = borrow_service.auto_route_to_warehouse(
            session,
            request_id,
            current_user.id,
            note=payload.notes,
        )
        return create_success_response(
            data=borrow_service.serialize_borrow_request(session, updated_req),
            message="Routed to warehouse",
            request=request,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/requests/{request_id}/warehouse-approve",
    response_model=GenericResponse[WarehouseApprovalRead],
)
async def warehouse_approve(
    request_id: str,
    payload: BorrowRequestWarehouseApprove,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:warehouse:manage")),
):
    try:
        approval = borrow_service.warehouse_approve(
            session,
            request_id,
            current_user.id,
            remarks=payload.notes,
        )
        return create_success_response(
            data=approval, message="Warehouse approved", request=request
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/requests/{request_id}/warehouse-approve-with-provision",
    response_model=GenericResponse[WarehouseApprovalRead],
)
async def warehouse_approve_with_provision(
    request_id: str,
    payload: BorrowRequestWarehouseApproveWithProvision,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:warehouse:manage")),
):
    try:
        approval = borrow_service.warehouse_approve_with_provision(
            session=session,
            request_id=request_id,
            actor_id=current_user.id,
            remarks=payload.notes,
            provision_qty=payload.provision_qty,
            units_data=[unit.model_dump() for unit in payload.units],
            item_id=payload.item_id,
        )
        return create_success_response(
            data=approval,
            message="Warehouse approved with provisioning",
            request=request,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/requests/{request_id}/warehouse-reject",
    response_model=GenericResponse[BorrowRequestRead],
)
async def warehouse_reject(
    request_id: str,
    request: Request,
    remarks: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: User = Depends(shift_guard),
    __: None = Depends(require_permission("inventory:warehouse:manage")),
):
    try:
        updated_req = borrow_service.warehouse_reject(
            session,
            request_id,
            current_user.id,
            remarks,
        )
        return create_success_response(
            data=borrow_service.serialize_borrow_request(session, updated_req),
            message="Warehouse rejected",
            request=request,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
