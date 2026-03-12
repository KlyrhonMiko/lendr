from uuid import UUID

from fastapi import HTTPException
from sqlmodel import Session

from core.base_service import BaseService
from systems.inventory.models.borrow_request import BorrowRequest
from systems.inventory.models.user import User
from systems.inventory.schemas.borrow_request_schemas import (
    BorrowRequestCreate,
    BorrowRequestUpdate,
)
from systems.inventory.services.inventory_service import InventoryService
from systems.inventory.services.user_service import UserService
from utils.time_utils import get_now_manila

_DEFAULT_STATUSES = ["pending", "approved", "released", "returned"]

class BorrowService(BaseService[BorrowRequest, BorrowRequestCreate, BorrowRequestUpdate]):
    def __init__(self):
        super().__init__(BorrowRequest, lookup_field="borrow_id")
        self.inventory_service = InventoryService()
        self.user_service = UserService()

    def _get_workflow(self, session: Session) -> list[str]:
        """Returns status names in pipeline order from config, falling back to defaults."""
        from systems.inventory.services.configuration_service import (
            ConfigurationService,
        )
        settings = ConfigurationService().get_by_category(session, "borrow_status")
        if not settings:
            return _DEFAULT_STATUSES
        return [s.key for s in sorted(settings, key=lambda s: int(s.value))]

    def _stage(self, session: Session, index: int) -> str:
        """Returns the status name at a given pipeline position (0-based)."""
        workflow = self._get_workflow(session)
        if index >= len(workflow):
            raise ValueError(f"Workflow has no stage at position {index}")
        return workflow[index]

    def _active_statuses(self, session: Session) -> list[str]:
        """Returns all non-terminal statuses (everything except the last stage)."""
        workflow = self._get_workflow(session)
        return workflow[:-1]

    def create_request(self, session: Session, schema: BorrowRequestCreate) -> BorrowRequest:
        borrower = self.user_service.get(session, schema.borrower_id)
        if not borrower:
            raise ValueError(f"Borrower {schema.borrower_id} not found")

        item = self.inventory_service.get(session, schema.item_id)
        if not item:
            raise ValueError(f"Item {schema.item_id} not found")

        if item.available_qty < schema.qty_requested:
            raise ValueError(f"Insufficient stock. Available: {item.available_qty}")

        self.validate_uniqueness(
            session,
            schema,
            unique_fields=[["borrower_id", "item_id"]],
            extra_filters=[BorrowRequest.status.in_(self._active_statuses(session))]
        )

        return super().create(session, schema, prefix="BRW")

    def approve_request(self, session: Session, borrow_id: str, admin_id: UUID) -> BorrowRequest:
        stage_0 = self._stage(session, 0)
        stage_1 = self._stage(session, 1)
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != stage_0:
            raise ValueError(f"Request not found or not in '{stage_0}' status")

        db_request.status = stage_1
        db_request.approved_by = admin_id
        db_request.approved_at = get_now_manila()

        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def release_request(self, session: Session, borrow_id: str, admin_id: UUID) -> BorrowRequest:
        stage_1 = self._stage(session, 1)
        stage_2 = self._stage(session, 2)
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != stage_1:
            raise ValueError(f"Request not found or not in '{stage_1}' status")

        self.inventory_service.adjust_stock(session, db_request.item_id, -db_request.qty_requested)

        db_request.status = stage_2
        db_request.released_by = admin_id
        db_request.released_at = get_now_manila()

        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def return_request(self, session: Session, borrow_id: str) -> BorrowRequest:
        stage_2 = self._stage(session, 2)
        stage_3 = self._stage(session, 3)
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != stage_2:
            raise ValueError(f"Request not found or not in '{stage_2}' status")

        self.inventory_service.adjust_stock(session, db_request.item_id, db_request.qty_requested)

        db_request.status = stage_3
        db_request.returned_at = get_now_manila()

        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request
