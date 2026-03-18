from sqlmodel import Session, select, func
from systems.inventory.models.inventory import InventoryItem
from systems.inventory.models.borrow_request import BorrowRequest
from systems.inventory.models.borrow_request_item import BorrowRequestItem
from pydantic import BaseModel

class DashboardStats(BaseModel):
    total_equipment: int
    items_borrowed: int
    active_users: int
    low_stock_items: int

class DashboardService:
    def get_stats(self, session: Session) -> DashboardStats:
        # Total unique equipment types
        total_equipment = session.exec(
            select(func.count(InventoryItem.id))
            .where(InventoryItem.is_deleted.is_(False))
        ).one()
        
        # Items currently borrowed (sum all line-item quantities on released requests)
        items_borrowed = session.exec(
            select(func.sum(BorrowRequestItem.qty_requested))
            .join(BorrowRequest, BorrowRequestItem.borrow_uuid == BorrowRequest.id)
            .where(BorrowRequest.status == "released")
            .where(BorrowRequest.is_deleted.is_(False))
            .where(BorrowRequestItem.is_deleted.is_(False))
        ).one() or 0

        # Active users (unique borrowers in non-terminal states)
        active_users = session.exec(
            select(func.count(func.distinct(BorrowRequest.borrower_uuid)))
            .where(BorrowRequest.status.in_(["approved", "released"]))
            .where(BorrowRequest.is_deleted.is_(False))
        ).one()

        # Low stock items (available_qty <= 5)
        low_stock_items = session.exec(
            select(func.count(InventoryItem.id))
            .where(InventoryItem.available_qty <= 5)
            .where(InventoryItem.is_deleted.is_(False))
        ).one()

        return DashboardStats(
            total_equipment=total_equipment,
            items_borrowed=items_borrowed,
            active_users=active_users,
            low_stock_items=low_stock_items
        )

    def get_recent_activity(self, session: Session, limit: int = 5) -> list[BorrowRequest]:
        from sqlalchemy.orm import selectinload
        return session.exec(
            select(BorrowRequest)
            .where(BorrowRequest.is_deleted.is_(False))
            .options(
                selectinload(BorrowRequest.items).selectinload(BorrowRequestItem.inventory_item),
                selectinload(BorrowRequest.events)
            )
            .order_by(BorrowRequest.request_date.desc())
            .limit(limit)
        ).all()
