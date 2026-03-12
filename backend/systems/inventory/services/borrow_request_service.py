from uuid import UUID
from sqlmodel import Session
from fastapi import HTTPException
from utils.time_utils import get_now_manila
from core.base_service import BaseService
from systems.inventory.models.borrow_request import BorrowRequest
from systems.inventory.schemas.borrow_request_schemas import (
    BorrowRequestCreate, 
    BorrowRequestUpdate,
    BorrowRequestApprove,
    BorrowRequestRelease,
    BorrowRequestReturn
)
from systems.inventory.models.user import User
from systems.inventory.services.inventory_service import InventoryService
from systems.inventory.services.user_service import UserService


class BorrowService(BaseService[BorrowRequest, BorrowRequestCreate, BorrowRequestUpdate]):
    def __init__(self):
        super().__init__(BorrowRequest, lookup_field="borrow_id")
        self.inventory_service = InventoryService()
        self.user_service = UserService()

    def create(self, session: Session, schema: BorrowRequestCreate) -> BorrowRequest:
        borrower = self.user_service.get(session, schema.borrower_id)
        if not borrower:
            raise HTTPException(status_code=404, detail=f"Borrower {schema.borrower_id} not found")

        item = self.inventory_service.get(session, schema.item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {schema.item_id} not found")

        self.validate_uniqueness(
            session,
            schema,
            unique_fields=[["borrower_id", "item_id"]],
            extra_filters=[BorrowRequest.status.in_(["pending", "approved", "released"])]
        )

        return super().create(session, schema, prefix="BRW")

    def approve_request(self, session: Session, borrow_id: str, admin_id: UUID, schema: BorrowRequestApprove) -> BorrowRequest:
        admin = session.get(User, admin_id)
        if not admin:
            raise HTTPException(status_code=404, detail="Admin user not found")
        
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != "pending":
            raise HTTPException(status_code=400, detail="Request not found or not in pending status")
        
        db_request.status = "approved"
        db_request.approved_by = admin_id
        db_request.approved_at = get_now_manila()
        if schema.notes:
            db_request.notes = schema.notes
            
        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def release_request(self, session: Session, borrow_id: str, admin_id: UUID, schema: BorrowRequestRelease) -> BorrowRequest:
        admin = session.get(User, admin_id)
        if not admin:
            raise HTTPException(status_code=404, detail="Admin user not found")
        
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != "approved":
            raise HTTPException(status_code=400, detail="Request not found or not approved")
        
        # ACTUALLY UPDATE INVENTORY
        self.inventory_service.adjust_stock(session, db_request.item_id, -db_request.qty_requested)
        
        db_request.status = "released"
        db_request.released_by = admin_id
        db_request.released_at = get_now_manila()
        if schema.notes:
            db_request.notes = schema.notes
            
        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def return_request(self, session: Session, borrow_id: str, schema: BorrowRequestReturn) -> BorrowRequest:
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != "released":
            raise HTTPException(status_code=400, detail="Request not found or not currently released")
        
        # ACTUALLY UPDATE INVENTORY (Return items)
        self.inventory_service.adjust_stock(session, db_request.item_id, db_request.qty_requested)
        
        db_request.status = "returned"
        db_request.returned_at = get_now_manila()
        if schema.notes:
            db_request.notes = schema.notes
            
        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request
