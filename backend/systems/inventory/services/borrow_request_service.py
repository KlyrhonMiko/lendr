from sqlmodel import Session
from uuid import UUID

from core.base_service import BaseService
from systems.inventory.models.borrow_request import BorrowRequest
from systems.inventory.models.borrow_request_event import BorrowRequestEvent
from systems.inventory.schemas.borrow_request_schemas import (
    BorrowRequestBatchCreate,
    BorrowRequestCreate,
    BorrowRequestUpdate,
)
from systems.inventory.models.warehouse_approval import WarehouseApproval
from systems.inventory.schemas.borrow_request_schemas import BorrowRequestRead
from systems.inventory.services.inventory_service import InventoryService
from systems.inventory.services.user_service import UserService
from utils.id_generator import get_next_sequence
from utils.time_utils import get_now_manila

_DEFAULT_STATUSES = ["pending", "approved", "sent_to_warehouse", "warehouse_approved", "released", "returned"]

class BorrowService(BaseService[BorrowRequest, BorrowRequestCreate, BorrowRequestUpdate]):
    def __init__(self):
        super().__init__(BorrowRequest, lookup_field="borrow_id")
        self.inventory_service = InventoryService()
        self.user_service = UserService()

    def _get_workflow(self, session: Session) -> list[str]:
        from systems.inventory.services.configuration_service import ConfigurationService
        settings = ConfigurationService().get_by_category(session, "borrow_status")
        if not settings:
            return _DEFAULT_STATUSES
        return [s.key for s in sorted(settings, key=lambda s: int(s.value))]

    def _stage(self, session: Session, index: int) -> str:
        workflow = self._get_workflow(session)
        if index >= len(workflow):
            raise ValueError(f"Workflow has no stage at position {index}")
        return workflow[index]

    def _active_statuses(self, session: Session) -> list[str]:
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

        # Generate custom transaction_ref
        year = get_now_manila().year
        transaction_ref = get_next_sequence(session, self.model, "transaction_ref", f"TXN-{year}")
        
        data = schema.model_dump()
        data["transaction_ref"] = transaction_ref
        
        # Generate borrow_id
        if not data.get(self.lookup_field):
            data[self.lookup_field] = get_next_sequence(session, self.model, self.lookup_field, "BRW")

        db_obj = self.model(**data)
        session.add(db_obj)
        
        # Log event
        event = BorrowRequestEvent(
            borrow_id=db_obj.borrow_id,
            event_type="created",
            note=schema.notes
        )
        session.add(event)
        
        session.commit()
        session.refresh(db_obj)
        return db_obj

    def approve_request(self, session: Session, borrow_id: str, admin_id: UUID) -> BorrowRequest:
        stage_0 = self._stage(session, 0)
        stage_1 = self._stage(session, 1)
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != stage_0:
            raise ValueError(f"Request not found or not in '{stage_0}' status")

        db_request.status = stage_1
        db_request.approved_by = admin_id
        db_request.approved_at = get_now_manila()

        # Log event
        event = BorrowRequestEvent(
            borrow_id=db_request.borrow_id,
            event_type="approved",
            actor_id=admin_id
        )
        session.add(event)
        
        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def release_request(self, session: Session, borrow_id: str, admin_id: UUID) -> BorrowRequest:
        stage_3 = self._stage(session, 3)
        stage_2 = self._stage(session, 4)
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != stage_3:
            raise ValueError(f"Request not found or not in '{stage_3}' status")

        self.inventory_service.adjust_stock(session, db_request.item_id, -db_request.qty_requested, movement_type="borrow_release", reference_id=db_request.borrow_id)

        db_request.status = stage_2
        db_request.released_by = admin_id
        db_request.released_at = get_now_manila()

        # Log event
        event = BorrowRequestEvent(
            borrow_id=db_request.borrow_id,
            event_type="released",
            actor_id=admin_id
        )
        session.add(event)

        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def return_request(self, session: Session, borrow_id: str) -> BorrowRequest:
        stage_4 = self._stage(session, 4)
        stage_5 = self._stage(session, 5)
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != stage_4:
            raise ValueError(f"Request not found or not in '{stage_4}' status")

        self.inventory_service.adjust_stock(session, db_request.item_id, db_request.qty_requested, movement_type="borrow_return", reference_id=db_request.borrow_id)

        now = get_now_manila()
        db_request.status = stage_5
        db_request.returned_at = now
        
        # Calculate returned_on_time
        if db_request.due_at:
            db_request.returned_on_time = now <= db_request.due_at
        else:
            db_request.returned_on_time = True # Or None if you prefer

        # Log event
        event = BorrowRequestEvent(
            borrow_id=db_request.borrow_id,
            event_type="returned"
        )
        session.add(event)

        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def create_batch_requests(self, session: Session, schema: BorrowRequestBatchCreate) -> list[BorrowRequest]:
        borrower = self.user_service.get(session, schema.borrower_id)
        if not borrower:
            raise ValueError(f"Borrower {schema.borrower_id} not found")

        created_requests = []
        try:
            for item_data in schema.items:
                request_schema = BorrowRequestCreate(
                    item_id=item_data.item_id,
                    borrower_id=schema.borrower_id,
                    qty_requested=item_data.qty_requested,
                    notes=schema.notes,
                    # Pass the new fields!
                    due_at=schema.due_at,
                    team_name=schema.team_name,
                    store_name=schema.store_name,
                    location_name=schema.location_name,
                    is_emergency=schema.is_emergency
                )
                borrow_req = self.create_request(session, request_schema)
                created_requests.append(borrow_req)
            return created_requests
        except Exception as e:
            raise e

    def send_to_warehouse(self, session: Session, borrow_id: str, actor_id: UUID) -> BorrowRequest:
        # Define the jump from approved to sent_to_warehouse
        # Since we haven't updated _DEFAULT_STATUSES yet, let's assume the flow is:
        # pending (0) -> approved (1) -> sent_to_warehouse (2) -> warehouse_approved (3) -> released (4) -> returned (5)
        # Note: You'll need to update your SystemSettings 'borrow_status' later if you use them!
        
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != "approved":
            raise ValueError("Request must be in 'approved' status to be sent to warehouse")

        db_request.status = "sent_to_warehouse"
        
        # Log event
        event = BorrowRequestEvent(
            borrow_id=db_request.borrow_id,
            event_type="sent_to_warehouse",
            actor_id=actor_id
        )
        session.add(event)
        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def warehouse_approve(self, session: Session, borrow_id: str, admin_id: UUID, remarks: str | None = None) -> WarehouseApproval:
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != "sent_to_warehouse":
            raise ValueError("Request must be in 'sent_to_warehouse' status")

        # Create warehouse approval record
        approval = WarehouseApproval(
            borrow_id=borrow_id,
            approved_by=admin_id,
            remarks=remarks,
            # Snapshot the request data for the receipt
            printable_payload_json=db_request.model_dump(mode="json") 
        )
        
        db_request.status = "warehouse_approved"
        
        # Log event
        event = BorrowRequestEvent(
            borrow_id=db_request.borrow_id,
            event_type="warehouse_approved",
            actor_id=admin_id,
            note=remarks
        )
        
        session.add(approval)
        session.add(event)
        session.add(db_request)
        session.commit()
        session.refresh(approval)
        return approval
