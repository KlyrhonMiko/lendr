from sqlalchemy import case
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


class LowStockItemRead(BaseModel):
    item_id: str
    name: str
    category: str | None = None
    available_qty: int
    total_qty: int


class InventoryCategoryBreakdown(BaseModel):
    category: str
    count: int


class DashboardService:
    def get_stats(self, session: Session) -> DashboardStats:
        total_equipment = session.exec(
            select(func.count(InventoryItem.id))
            .where(InventoryItem.is_deleted.is_(False))
        ).one()

        items_borrowed = session.exec(
            select(func.sum(BorrowRequestItem.qty_requested))
            .join(BorrowRequest, BorrowRequestItem.borrow_uuid == BorrowRequest.id)
            .where(BorrowRequest.status == "released")
            .where(BorrowRequest.is_deleted.is_(False))
            .where(BorrowRequestItem.is_deleted.is_(False))
        ).one() or 0

        active_users = session.exec(
            select(func.count(func.distinct(BorrowRequest.borrower_uuid)))
            .where(BorrowRequest.status.in_(["approved", "released"]))
            .where(BorrowRequest.is_deleted.is_(False))
        ).one()

        low_stock_items = session.exec(
            select(func.count(InventoryItem.id))
            .where(InventoryItem.available_qty <= 5)
            .where(InventoryItem.is_deleted.is_(False))
        ).one()

        return DashboardStats(
            total_equipment=total_equipment,
            items_borrowed=items_borrowed,
            active_users=active_users,
            low_stock_items=low_stock_items,
        )

    def get_recent_activity(self, session: Session, limit: int = 5) -> list[BorrowRequest]:
        from sqlalchemy.orm import selectinload

        return session.exec(
            select(BorrowRequest)
            .where(BorrowRequest.is_deleted.is_(False))
            .options(
                selectinload(BorrowRequest.items).selectinload(BorrowRequestItem.inventory_item),
                selectinload(BorrowRequest.events),
            )
            .order_by(BorrowRequest.request_date.desc())
            .limit(limit)
        ).all()

    def get_low_stock_items(self, session: Session, threshold: int = 5) -> list[LowStockItemRead]:
        items = session.exec(
            select(InventoryItem)
            .where(InventoryItem.available_qty <= threshold)
            .where(InventoryItem.is_deleted.is_(False))
            .order_by(InventoryItem.available_qty.asc())
            .limit(10)
        ).all()
        return [
            LowStockItemRead(
                item_id=i.item_id,
                name=i.name,
                category=i.category,
                available_qty=i.available_qty,
                total_qty=i.total_qty,
            )
            for i in items
        ]

    def get_pending_counts(self, session: Session) -> dict[str, int]:
        """Counts of requests in each actionable state."""
        rows = session.exec(
            select(BorrowRequest.status, func.count(BorrowRequest.id))
            .where(BorrowRequest.is_deleted.is_(False))
            .where(BorrowRequest.status.in_(["pending", "approved", "released"]))
            .group_by(BorrowRequest.status)
        ).all()
        return {status: count for status, count in rows}

    def get_inventory_by_category(self, session: Session) -> list[InventoryCategoryBreakdown]:
        label = case(
            (
                (InventoryItem.classification.is_(None)) | (InventoryItem.classification == ""),
                "Uncategorized",
            ),
            else_=InventoryItem.classification,
        )
        rows = session.exec(
            select(label, func.count(InventoryItem.id))
            .where(InventoryItem.is_deleted.is_(False))
            .group_by(label)
            .order_by(func.count(InventoryItem.id).desc())
        ).all()
        return [
            InventoryCategoryBreakdown(category=cat, count=cnt)
            for cat, cnt in rows
        ]
