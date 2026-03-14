from sqlmodel import Session, select
from uuid import UUID

from core.base_service import BaseService
from systems.inventory.models.borrow_request import BorrowRequest
from systems.inventory.models.borrow_request_event import BorrowRequestEvent
from systems.inventory.schemas.borrow_request_schemas import (
    BorrowRequestBatchCreate,
    BorrowRequestCreate,
    BorrowRequestUpdate,
)
from systems.inventory.models.borrow_participant import BorrowParticipant
from systems.inventory.models.warehouse_approval import WarehouseApproval
from systems.inventory.services.inventory_service import InventoryService
from systems.admin.services.user_service import UserService
from systems.inventory.services.audit_service import audit_service
from utils.id_generator import get_next_sequence
from utils.time_utils import get_now_manila

_DEFAULT_STATUSES = ["pending", "approved", "sent_to_warehouse", "warehouse_approved", "released", "returned"]

class BorrowService(BaseService[BorrowRequest, BorrowRequestCreate, BorrowRequestUpdate]):
    def __init__(self):
        super().__init__(BorrowRequest, lookup_field="borrow_id")
        self.inventory_service = InventoryService()
        self.user_service = UserService()

    def _get_workflow(self, session: Session) -> list[str]:
        from systems.admin.services.configuration_service import ConfigurationService
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

    def _normalize_compliance_fields(self, data: dict) -> dict:
        payload = {**data}
        is_emergency = bool(payload.get("is_emergency"))
        request_channel = str(payload.get("request_channel") or "inventory_manager")
        compliance_notes = payload.get("compliance_followup_notes")

        if is_emergency:
            payload["compliance_followup_required"] = True
            if not compliance_notes:
                if request_channel == "borrower_portal":
                    payload["compliance_followup_notes"] = "Emergency request from portal. Verify condition manually."
                else:
                    payload["compliance_followup_notes"] = "Emergency request. Verify condition manually."
        elif payload.get("compliance_followup_required") and not compliance_notes:
            payload["compliance_followup_notes"] = "Compliance follow-up required."

        return payload

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
        
        data = self._normalize_compliance_fields(schema.model_dump())
        data["transaction_ref"] = transaction_ref
        
        # Pull participants out of data before creating the BorrowRequest object
        # so they don't get saved as a JSON blob in involved_people
        participants_data = data.pop("involved_people", [])

        # Generate borrow_id
        if not data.get(self.lookup_field):
            data[self.lookup_field] = get_next_sequence(session, self.model, self.lookup_field, "BRW")

        db_obj = self.model(**data)
        session.add(db_obj)

        # Normalize participants
        if participants_data:
            for p in participants_data:
                participant = BorrowParticipant(
                    borrow_id=db_obj.borrow_id,
                    user_id=p.get("user_id"),
                    name=p.get("name") or p.get("fullname"),
                    role_in_request=p.get("role") or "witness"
                )
                session.add(participant)
        
        # Log event
        event = BorrowRequestEvent(
            borrow_id=db_obj.borrow_id,
            event_type="created",
            note=schema.notes
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_obj.borrow_id,
            action="create",
            after=db_obj.model_dump(mode="json"),
            actor_id=None, # Wire later
        )
        session.add(event)
        
        session.commit()
        session.refresh(db_obj)
        return db_obj

    def approve_request(
        self,
        session: Session,
        borrow_id: str,
        admin_id: UUID,
        note: str | None = None,
    ) -> BorrowRequest:
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
            actor_id=admin_id,
            note=note,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="approve",
            after=db_request.model_dump(mode="json"),
            actor_id=None, # Wire later
        )
        session.add(event)
        
        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def reject_request(
        self,
        session: Session,
        borrow_id: str,
        admin_id: UUID,
        note: str | None = None,
    ) -> BorrowRequest:
        stage_0 = self._stage(session, 0)
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != stage_0:
            raise ValueError(f"Request not found or not in '{stage_0}' status")

        db_request.status = "rejected"

        event = BorrowRequestEvent(
            borrow_id=db_request.borrow_id,
            event_type="rejected",
            actor_id=admin_id,
            note=note,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="reject",
            after=db_request.model_dump(mode="json"),
            actor_id=None,
        )
        session.add(event)

        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def release_request(
        self,
        session: Session,
        borrow_id: str,
        admin_id: UUID,
        note: str | None = None,
    ) -> BorrowRequest:
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
            actor_id=admin_id,
            note=note,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="release",
            after=db_request.model_dump(mode="json"),
            actor_id=None, # Wire later
        )
        session.add(event)

        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def return_request(
        self,
        session: Session,
        borrow_id: str,
        actor_id: UUID,
        note: str | None = None,
    ) -> BorrowRequest:
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
            event_type="returned",
            actor_id=actor_id,
            note=note,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="return",
            after=db_request.model_dump(mode="json"),
            actor_id=None, # Wire later
        )
        session.add(event)

        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def reopen_request(
        self,
        session: Session,
        borrow_id: str,
        actor_id: UUID,
        note: str | None = None,
    ) -> BorrowRequest:
        pending_stage = self._stage(session, 0)
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status not in {"rejected", "warehouse_rejected"}:
            raise ValueError("Request must be in 'rejected' or 'warehouse_rejected' status")

        duplicate_active_request = session.exec(
            select(BorrowRequest).where(
                BorrowRequest.borrower_id == db_request.borrower_id,
                BorrowRequest.item_id == db_request.item_id,
                BorrowRequest.is_deleted.is_(False),
                BorrowRequest.status.in_(self._active_statuses(session)),
                BorrowRequest.id != db_request.id,
            )
        ).first()
        if duplicate_active_request:
            raise ValueError(
                "Cannot reopen request while another active request for the same borrower and item exists"
            )

        db_request.status = pending_stage

        event = BorrowRequestEvent(
            borrow_id=db_request.borrow_id,
            event_type="reopened",
            actor_id=actor_id,
            note=note,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="reopen",
            after=db_request.model_dump(mode="json"),
            actor_id=None,
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
                    is_emergency=schema.is_emergency,
                    request_channel=schema.request_channel,
                    compliance_followup_required=schema.compliance_followup_required,
                    compliance_followup_notes=schema.compliance_followup_notes,
                    involved_people=schema.involved_people if item_data == schema.items[0] else None # Only attach to first item in batch to avoid duplicates if mapping isn't item-specific
                )
                borrow_req = self.create_request(session, request_schema)
                created_requests.append(borrow_req)
            return created_requests
        except Exception as e:
            raise e

    def send_to_warehouse(
        self,
        session: Session,
        borrow_id: str,
        actor_id: UUID,
        note: str | None = None,
    ) -> BorrowRequest:
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
            actor_id=actor_id,
            note=note,
        )
        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="warehouse_send",
            after=db_request.model_dump(mode="json"),
            actor_id=None, # Wire later
        )
        session.add(event)
        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def warehouse_approve(
        self,
        session: Session,
        borrow_id: str,
        admin_id: UUID,
        remarks: str | None = None,
    ) -> WarehouseApproval:
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
        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="warehouse_approve",
            after=db_request.model_dump(mode="json"),
            actor_id=None, # Wire later
        )
        
        session.add(approval)
        session.add(event)
        session.add(db_request)
        session.commit()
        session.refresh(approval)
        return approval

    def warehouse_reject(self, session: Session, borrow_id: str, admin_id: UUID, remarks: str | None = None) -> BorrowRequest:
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != "sent_to_warehouse":
            raise ValueError("Request must be in 'sent_to_warehouse' status")

        db_request.status = "warehouse_rejected"

        event = BorrowRequestEvent(
            borrow_id=db_request.borrow_id,
            event_type="warehouse_rejected",
            actor_id=admin_id,
            note=remarks,
        )
        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="warehouse_reject",
            after=db_request.model_dump(mode="json"),
            actor_id=None,
        )

        session.add(event)
        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request
