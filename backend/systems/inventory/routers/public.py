from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session, select
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from core.database import get_session
from core.schemas import GenericResponse, create_success_response, make_pagination_meta
from systems.inventory.schemas.inventory_schemas import InventoryItemRead
from systems.inventory.schemas.inventory_unit_schemas import InventoryUnitRead
from systems.inventory.services.inventory_service import InventoryService
from systems.inventory.models.borrow_request_unit import BorrowRequestUnit
from systems.inventory.models.borrow_request import BorrowRequest
from systems.admin.models.user import User
from systems.inventory.models.inventory_unit import InventoryUnit

router = APIRouter()
inventory_service = InventoryService()

class PublicActiveBorrowRead(BaseModel):
    borrower_name: str
    customer_name: Optional[str] = None
    location_name: Optional[str] = None
    released_at: Optional[datetime] = None
    return_at: Optional[datetime] = None

class PublicBorrowHistoryRead(BaseModel):
    borrower_name: str
    returned_at: datetime
    location_name: Optional[str] = None

class PublicInventoryItemRead(InventoryItemRead):
    active_borrows: List[PublicActiveBorrowRead] = []
    borrow_history: List[PublicBorrowHistoryRead] = []

class PublicInventoryUnitRead(InventoryUnitRead):
    active_borrow: Optional[PublicActiveBorrowRead] = None
    borrow_history: List[PublicBorrowHistoryRead] = []

def get_active_borrow_for_unit(session: Session, unit_uuid: any) -> Optional[PublicActiveBorrowRead]:
    """Helper to fetch active borrow details for a trackable unit."""
    stmt = (
        select(BorrowRequest, User)
        .join(BorrowRequestUnit, BorrowRequestUnit.borrow_uuid == BorrowRequest.id)
        .join(User, BorrowRequest.borrower_uuid == User.id)
        .where(
            BorrowRequestUnit.unit_uuid == unit_uuid,
            BorrowRequestUnit.released_at.is_not(None),
            BorrowRequestUnit.returned_at.is_(None),
            BorrowRequest.is_deleted.is_(False)
        )
    )
    result = session.exec(stmt).first()
    if result:
        req, user = result
        return PublicActiveBorrowRead(
            borrower_name=user.full_name,
            customer_name=req.customer_name,
            location_name=req.location_name,
            released_at=req.released_at,
            return_at=req.return_at
        )
    return None

def get_borrow_history(session: Session, unit_uuid: any = None, item_uuid: any = None, limit: int = 5) -> List[PublicBorrowHistoryRead]:
    """Helper to fetch recent returned borrows."""
    stmt = (
        select(BorrowRequest, User, BorrowRequestUnit)
        .join(BorrowRequestUnit, BorrowRequestUnit.borrow_uuid == BorrowRequest.id)
        .join(User, BorrowRequest.borrower_uuid == User.id)
        .where(
            BorrowRequestUnit.returned_at.is_not(None),
            BorrowRequest.is_deleted.is_(False)
        )
        .order_by(BorrowRequestUnit.returned_at.desc())
        .limit(limit)
    )
    
    if unit_uuid:
        stmt = stmt.where(BorrowRequestUnit.unit_uuid == unit_uuid)
    elif item_uuid:
        # For item level, we need to join unit -> item
        stmt = stmt.join(InventoryUnit, BorrowRequestUnit.unit_uuid == InventoryUnit.id).where(InventoryUnit.inventory_uuid == item_uuid)
    
    results = session.exec(stmt).all()
    history = []
    for req, user, unit_req in results:
        history.append(PublicBorrowHistoryRead(
            borrower_name=user.full_name,
            returned_at=unit_req.returned_at,
            location_name=req.location_name
        ))
    return history

@router.get(
    "/{item_id}",
    response_model=GenericResponse[PublicInventoryItemRead],
    responses={404: {"model": GenericResponse}},
)
async def get_public_item(
    item_id: str,
    request: Request,
    session: Session = Depends(get_session),
):
    """
    Publicly accessible endpoint to retrieve basic details of a scanned item.
    Includes active borrows if some units are currently out.
    """
    item = inventory_service.get(session, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    item_read_data = item.model_dump()
    item_read = PublicInventoryItemRead(**item_read_data)
    balances = inventory_service.get_item_balances(session, item)
    item_read.total_qty = balances["total_qty"]
    item_read.available_qty = balances["available_qty"]
    item_read.condition = inventory_service.get_item_condition(session, item)
    item_read.status_condition = inventory_service.get_item_status(session, item)

    # Fetch borrow history for item level
    item_read.borrow_history = get_borrow_history(session, item_uuid=item.id)

    # For items, we might want to list who currently has units of this item
    if item.is_trackable:
        active_borrows_stmt = (
            select(BorrowRequest, User)
            .join(BorrowRequestUnit, BorrowRequestUnit.borrow_uuid == BorrowRequest.id)
            .join(InventoryUnit, BorrowRequestUnit.unit_uuid == InventoryUnit.id)
            .join(User, BorrowRequest.borrower_uuid == User.id)
            .where(
                InventoryUnit.inventory_uuid == item.id,
                BorrowRequestUnit.released_at.is_not(None),
                BorrowRequestUnit.returned_at.is_(None),
                BorrowRequest.is_deleted.is_(False)
            )
        )
        results = session.exec(active_borrows_stmt).all()
        for req, user in results:
            item_read.active_borrows.append(PublicActiveBorrowRead(
                borrower_name=user.full_name,
                customer_name=req.customer_name,
                location_name=req.location_name,
                released_at=req.released_at,
                return_at=req.return_at
            ))

    return create_success_response(data=item_read, request=request)


@router.get(
    "/{item_id}/units",
    response_model=GenericResponse[list[PublicInventoryUnitRead]],
    responses={404: {"model": GenericResponse}},
)
async def list_public_units(
    item_id: str,
    request: Request,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=500),
    status: Optional[str] = Query(default=None),
    condition: Optional[str] = Query(default=None),
    serial_number: Optional[str] = Query(default=None),
    expiring_before: Optional[str] = Query(default=None),
    include_expired: bool = Query(default=False),
    session: Session = Depends(get_session),
):
    """
    Publicly accessible endpoint to list units for a scanned item.
    Each unit includes its active borrow info and history if available.
    """
    skip = (page - 1) * per_page
    units, total = inventory_service.get_units_by_status(
        session,
        item_id=item_id,
        status=status,
        condition=condition,
        serial_number=serial_number,
        expiring_before=expiring_before,
        include_expired=include_expired,
        skip=skip,
        limit=per_page,
    )
    
    units_read = []
    for u in units:
        u_read_data = u.model_dump()
        u_read = PublicInventoryUnitRead(**u_read_data)
        if u.status == "borrowed":
            u_read.active_borrow = get_active_borrow_for_unit(session, u.id)
        
        # Always fetch history for the unit if it exists
        u_read.borrow_history = get_borrow_history(session, unit_uuid=u.id)
        units_read.append(u_read)

    return create_success_response(
        data=units_read,
        meta=make_pagination_meta(total=total, skip=skip, limit=per_page, page=page, per_page=per_page),
        request=request,
    )
