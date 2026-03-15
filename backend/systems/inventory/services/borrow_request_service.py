from sqlmodel import Session, select
from uuid import UUID

from core.base_service import BaseService
from systems.admin.models.user import User
from systems.inventory.models.borrow_request import BorrowRequest
from systems.inventory.models.borrow_request_event import BorrowRequestEvent
from systems.inventory.models.borrow_request_unit import BorrowRequestUnit
from systems.inventory.models.inventory import InventoryItem
from systems.inventory.schemas.borrow_request_schemas import (
    BorrowRequestBatchCreate,
    BorrowRequestCreate,
    BorrowRequestUnitReturn,
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

    def _get_user_by_uuid(self, session: Session, user_id: UUID | None) -> User | None:
        if user_id is None:
            return None
        return session.exec(select(User).where(User.id == user_id, User.is_deleted.is_(False))).first()

    def _get_borrow_assignments(self, session: Session, borrow_id: str) -> list[BorrowRequestUnit]:
        return list(
            session.exec(
                select(BorrowRequestUnit)
                .where(
                    BorrowRequestUnit.borrow_id == borrow_id,
                    BorrowRequestUnit.is_deleted.is_(False),
                )
                .order_by(BorrowRequestUnit.created_at.asc())
            ).all()
        )

    def _validate_trackable_assignment_prerequisites(
        self,
        session: Session,
        db_request: BorrowRequest,
        item: InventoryItem,
    ) -> list[BorrowRequestUnit]:
        if not item.is_trackable:
            return []

        assignments = self._get_borrow_assignments(session, db_request.borrow_id)
        if len(assignments) != db_request.qty_requested:
            raise ValueError(
                f"Trackable item '{item.item_id}' requires exactly {db_request.qty_requested} assigned units before release"
            )

        return assignments

    def _set_sent_to_warehouse(
        self,
        session: Session,
        db_request: BorrowRequest,
        actor_id: UUID,
        note: str | None = None,
        approval_channel: str = "warehouse_manual",
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> None:
        db_request.status = "sent_to_warehouse"
        db_request.approval_channel = approval_channel

        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_id=db_request.borrow_id,
            event_type="sent_to_warehouse",
            actor_id=actor_id,
            actor_employee_id=actor_employee_id,
            note=note,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="warehouse_send",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )
        session.add(event)
        session.add(db_request)

    def get_assigned_units(self, session: Session, borrow_id: str) -> list[BorrowRequestUnit]:
        return self._get_borrow_assignments(session, borrow_id)

    def assign_units(
        self,
        session: Session,
        borrow_id: str,
        unit_ids: list[str],
        actor_id: UUID,
        note: str | None = None,
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> list[BorrowRequestUnit]:
        db_request = self.get(session, borrow_id)
        if not db_request:
            raise ValueError("Request not found")

        if db_request.status not in {"approved", "sent_to_warehouse", "warehouse_approved"}:
            raise ValueError("Units can only be assigned when request is approved, sent_to_warehouse, or warehouse_approved")

        item = self.inventory_service.get(session, db_request.item_id)
        if not item:
            raise ValueError(f"Item {db_request.item_id} not found")
        if not item.is_trackable:
            raise ValueError("Unit assignment is only applicable to trackable items")

        normalized_unit_ids = [unit_id.strip() for unit_id in unit_ids if unit_id and unit_id.strip()]
        if len(normalized_unit_ids) != len(unit_ids):
            raise ValueError("unit_ids must not contain empty values")
        if len(set(normalized_unit_ids)) != len(normalized_unit_ids):
            raise ValueError("unit_ids must be unique")
        if len(normalized_unit_ids) != db_request.qty_requested:
            raise ValueError(
                f"Expected {db_request.qty_requested} units for request {borrow_id}, got {len(normalized_unit_ids)}"
            )

        existing_assignments = self._get_borrow_assignments(session, borrow_id)
        if existing_assignments:
            raise ValueError("Units are already assigned for this request")

        borrower = self.user_service.get(session, db_request.borrower_id)
        approver = self._get_user_by_uuid(session, db_request.approved_by)
        now = get_now_manila()
        created_assignments: list[BorrowRequestUnit] = []

        for unit_id in normalized_unit_ids:
            unit = self.inventory_service.get_unit(session, unit_id)
            if not unit or unit.inventory_id != db_request.item_id:
                raise ValueError(f"Unit {unit_id} does not belong to item {db_request.item_id}")
            if unit.status != "available":
                raise ValueError(f"Unit {unit_id} is not available for assignment")

            assignment = BorrowRequestUnit(
                borrow_unit_id=get_next_sequence(session, BorrowRequestUnit, "borrow_unit_id", "BRU"),
                borrow_id=db_request.borrow_id,
                unit_id=unit.unit_id,
                requested_at=db_request.request_date,
                approved_at=db_request.approved_at,
                assigned_at=now,
                requested_by=borrower.id if borrower else None,
                requested_by_user_id=borrower.user_id if borrower else db_request.borrower_id,
                requested_by_employee_id=borrower.employee_id if borrower else None,
                approved_by=db_request.approved_by,
                approved_by_user_id=approver.user_id if approver else None,
                approved_by_employee_id=approver.employee_id if approver else None,
                assigned_by=actor_id,
                assigned_by_user_id=actor_user_id,
                assigned_by_employee_id=actor_employee_id,
            )
            session.add(assignment)
            created_assignments.append(assignment)

        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_id=db_request.borrow_id,
            event_type="units_assigned",
            actor_id=actor_id,
            actor_employee_id=actor_employee_id,
            note=note,
        )
        session.add(event)

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="assign_units",
            after={
                "borrow_id": db_request.borrow_id,
                "unit_ids": normalized_unit_ids,
                "assigned_by_user_id": actor_user_id,
                "assigned_by_employee_id": actor_employee_id,
            },
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )

        session.commit()
        for assignment in created_assignments:
            session.refresh(assignment)
        return created_assignments

    def create_request(self, session: Session, schema: BorrowRequestCreate, actor_id: UUID | None = None, actor_user_id: str | None = None, actor_employee_id: str | None = None) -> BorrowRequest:
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
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_id=db_obj.borrow_id,
            event_type="created",
            actor_id=actor_id,
            actor_employee_id=actor_employee_id,
            note=schema.notes
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_obj.borrow_id,
            action="create",
            after=db_obj.model_dump(mode="json"),
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )
        session.add(event)
        
        session.commit()
        session.refresh(db_obj)
        return db_obj

    def approve_request(
        self,
        session: Session,
        borrow_id: str,
        actor_id: UUID,
        note: str | None = None,
        auto_route_shortage: bool = True,
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> BorrowRequest:
        stage_0 = self._stage(session, 0)
        stage_1 = self._stage(session, 1)
        stage_2 = self._stage(session, 2)
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != stage_0:
            raise ValueError(f"Request not found or not in '{stage_0}' status")

        item = self.inventory_service.get(session, db_request.item_id)
        if not item:
            raise ValueError(f"Item {db_request.item_id} not found")

        if item.available_qty < db_request.qty_requested and not auto_route_shortage:
            shortage = db_request.qty_requested - item.available_qty
            raise ValueError(
                f"Insufficient stock for approval. Requested {db_request.qty_requested}, available {item.available_qty}, shortage {shortage}. Route to warehouse first."
            )

        db_request.status = stage_1
        db_request.approval_channel = "standard"
        db_request.approved_by = actor_id
        db_request.approved_at = get_now_manila()

        if item.available_qty < db_request.qty_requested:
            shortage = db_request.qty_requested - item.available_qty
            db_request.status = stage_2
            warehouse_note = note or (
                f"Auto-routed to warehouse due to shortage: requested={db_request.qty_requested}, available={item.available_qty}, shortage={shortage}"
            )
            self._set_sent_to_warehouse(
                session,
                db_request,
                actor_id,
                note=warehouse_note,
                approval_channel="warehouse_shortage_auto",
                actor_user_id=actor_user_id,
                actor_employee_id=actor_employee_id,
            )

        # Log event
        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_id=db_request.borrow_id,
            event_type="approved",
            actor_id=actor_id,
            actor_employee_id=actor_employee_id,
            note=note,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="approve",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
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
        actor_id: UUID,
        note: str | None = None,
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> BorrowRequest:
        stage_0 = self._stage(session, 0)
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != stage_0:
            raise ValueError(f"Request not found or not in '{stage_0}' status")

        db_request.status = "rejected"

        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_id=db_request.borrow_id,
            event_type="rejected",
            actor_id=actor_id,
            actor_employee_id=actor_employee_id,
            note=note,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="reject",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
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
        actor_id: UUID,
        note: str | None = None,
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> BorrowRequest:
        stage_approved = self._stage(session, 1)
        stage_warehouse_approved = self._stage(session, 3)
        stage_released = self._stage(session, 4)
        db_request = self.get(session, borrow_id)
        if not db_request:
            raise ValueError("Request not found")

        is_emergency_bypass = db_request.is_emergency and db_request.status == stage_approved
        is_direct_release = db_request.status == stage_approved and not db_request.is_emergency
        is_warehouse_release = db_request.status == stage_warehouse_approved
        if not (is_emergency_bypass or is_direct_release or is_warehouse_release):
            raise ValueError(
                f"Request not found or not in '{stage_approved}' or '{stage_warehouse_approved}' status"
            )

        item = self.inventory_service.get(session, db_request.item_id)
        if not item:
            raise ValueError(f"Item {db_request.item_id} not found")

        if is_direct_release and item.available_qty < db_request.qty_requested:
            raise ValueError(
                "Insufficient stock for direct release; route request to warehouse for provisioning"
            )

        now = get_now_manila()

        if not item.is_trackable:
            skip_event = BorrowRequestEvent(
                event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
                borrow_id=db_request.borrow_id,
                event_type="unit_assignment_skipped",
                actor_id=actor_id,
                actor_employee_id=actor_employee_id,
                note="Unit assignment skipped for non-trackable item",
            )
            session.add(skip_event)

        assignments = self._validate_trackable_assignment_prerequisites(session, db_request, item)
        for assignment in assignments:
            unit = self.inventory_service.get_unit(session, assignment.unit_id)
            if not unit:
                raise ValueError(f"Assigned unit {assignment.unit_id} not found")
            if unit.status != "available":
                raise ValueError(f"Assigned unit {assignment.unit_id} is not available for release")

            unit.status = "borrowed"
            assignment.released_at = now
            assignment.released_by = actor_id
            assignment.released_by_user_id = actor_user_id
            assignment.released_by_employee_id = actor_employee_id

            if assignment.approved_by is None:
                approver = self._get_user_by_uuid(session, db_request.approved_by)
                assignment.approved_by = db_request.approved_by
                assignment.approved_at = db_request.approved_at
                assignment.approved_by_user_id = approver.user_id if approver else None
                assignment.approved_by_employee_id = approver.employee_id if approver else None

            session.add(unit)
            session.add(assignment)

        self.inventory_service.adjust_stock(
            session,
            db_request.item_id,
            -db_request.qty_requested,
            movement_type="borrow_release",
            reference_id=db_request.borrow_id,
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )

        db_request.status = stage_released
        if is_emergency_bypass:
            db_request.approval_channel = "emergency_bypass"
        db_request.released_by = actor_id
        db_request.released_at = now

        # Log event
        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_id=db_request.borrow_id,
            event_type="released",
            actor_id=actor_id,
            actor_employee_id=actor_employee_id,
            note=note or ("Emergency release bypassed warehouse stage" if is_emergency_bypass else None),
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="release",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
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
        unit_returns: list[BorrowRequestUnitReturn] | None = None,
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> BorrowRequest:
        stage_4 = self._stage(session, 4)
        stage_5 = self._stage(session, 5)
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != stage_4:
            raise ValueError(f"Request not found or not in '{stage_4}' status")

        item = self.inventory_service.get(session, db_request.item_id)
        if not item:
            raise ValueError(f"Item {db_request.item_id} not found")

        unit_return_map = {
            unit_return.unit_id: unit_return
            for unit_return in (unit_returns or [])
        }

        assignments = self._validate_trackable_assignment_prerequisites(session, db_request, item)
        for assignment in assignments:
            unit = self.inventory_service.get_unit(session, assignment.unit_id)
            if not unit:
                raise ValueError(f"Assigned unit {assignment.unit_id} not found")
            if unit.status != "borrowed":
                raise ValueError(f"Assigned unit {assignment.unit_id} is not marked as borrowed")

            return_data = unit_return_map.get(assignment.unit_id)
            status_on_return = return_data.status_on_return if return_data else None
            if status_on_return is None:
                if return_data and return_data.condition and return_data.condition.lower() in {"damaged", "for_repair", "repair"}:
                    status_on_return = "maintenance"
                else:
                    status_on_return = "available"

            self.inventory_service._validate_status_transition(unit.status, status_on_return)
            unit.status = status_on_return
            if return_data and return_data.condition is not None:
                unit.condition = return_data.condition

            assignment.returned_at = get_now_manila()
            assignment.returned_by = actor_id
            assignment.returned_by_user_id = actor_user_id
            assignment.returned_by_employee_id = actor_employee_id
            assignment.condition_on_return = return_data.condition if return_data else None
            assignment.return_notes = return_data.notes if return_data else None

            session.add(unit)
            session.add(assignment)

        self.inventory_service.adjust_stock(
            session,
            db_request.item_id,
            db_request.qty_requested,
            movement_type="borrow_return",
            reference_id=db_request.borrow_id,
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )

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
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_id=db_request.borrow_id,
            event_type="returned",
            actor_id=actor_id,
            actor_employee_id=actor_employee_id,
            note=note,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="return",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
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
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
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
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_id=db_request.borrow_id,
            event_type="reopened",
            actor_id=actor_id,
            actor_employee_id=actor_employee_id,
            note=note,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="reopen",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )
        session.add(event)

        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def create_batch_requests(self, session: Session, schema: BorrowRequestBatchCreate, actor_id: UUID | None = None, actor_user_id: str | None = None, actor_employee_id: str | None = None) -> list[BorrowRequest]:
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
                borrow_req = self.create_request(session, request_schema, actor_id=actor_id, actor_user_id=actor_user_id, actor_employee_id=actor_employee_id)
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
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> BorrowRequest:
        stage_1 = self._stage(session, 1)
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != stage_1:
            raise ValueError(f"Request must be in '{stage_1}' status to be sent to warehouse")

        self._set_sent_to_warehouse(
            session,
            db_request,
            actor_id,
            note=note,
            approval_channel="warehouse_manual",
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )
        session.commit()
        session.refresh(db_request)
        return db_request

    def auto_route_to_warehouse(
        self,
        session: Session,
        borrow_id: str,
        actor_id: UUID,
        note: str | None = None,
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> BorrowRequest:
        stage_1 = self._stage(session, 1)
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != stage_1:
            raise ValueError(f"Request must be in '{stage_1}' status")

        item = self.inventory_service.get(session, db_request.item_id)
        if not item:
            raise ValueError(f"Item {db_request.item_id} not found")

        if item.available_qty >= db_request.qty_requested:
            raise ValueError(
                f"Request has sufficient stock already. Requested {db_request.qty_requested}, available {item.available_qty}."
            )

        shortage = db_request.qty_requested - item.available_qty
        final_note = note or (
            f"Auto-routed to warehouse due to shortage: requested={db_request.qty_requested}, available={item.available_qty}, shortage={shortage}"
        )
        self._set_sent_to_warehouse(
            session,
            db_request,
            actor_id,
            note=final_note,
            approval_channel="warehouse_shortage_auto",
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )
        session.commit()
        session.refresh(db_request)
        return db_request

    def warehouse_approve(
        self,
        session: Session,
        borrow_id: str,
        actor_id: UUID,
        remarks: str | None = None,
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> WarehouseApproval:
        return self.warehouse_approve_with_provision(
            session=session,
            borrow_id=borrow_id,
            actor_id=actor_id,
            remarks=remarks,
            provision_qty=0,
            units_data=None,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )

    def warehouse_approve_with_provision(
        self,
        session: Session,
        borrow_id: str,
        actor_id: UUID,
        remarks: str | None = None,
        provision_qty: int = 0,
        units_data: list[dict] | None = None,
        actor_user_id: str | None = None,
        actor_employee_id: str | None = None,
    ) -> WarehouseApproval:
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != "sent_to_warehouse":
            raise ValueError("Request must be in 'sent_to_warehouse' status")

        item = self.inventory_service.get(session, db_request.item_id)
        if not item:
            raise ValueError(f"Item {db_request.item_id} not found")

        if provision_qty < 0:
            raise ValueError("provision_qty cannot be negative")

        provision_units = units_data or []
        if item.is_trackable and provision_qty > 0 and len(provision_units) != provision_qty:
            raise ValueError(
                f"Trackable item provisioning requires exactly {provision_qty} unit records"
            )
        if not item.is_trackable and provision_units:
            raise ValueError("Units payload is only valid for trackable items")

        if provision_qty > 0:
            self.inventory_service.adjust_stock(
                session,
                db_request.item_id,
                provision_qty,
                movement_type="procurement",
                reference_id=db_request.borrow_id,
                note=remarks or f"Warehouse provisioned {provision_qty} units during approval",
                actor_id=actor_id,
                actor_user_id=actor_user_id,
                actor_employee_id=actor_employee_id,
            )

            if item.is_trackable:
                self.inventory_service.create_units_batch(
                    session,
                    item_id=db_request.item_id,
                    units_data=provision_units,
                    actor_id=actor_id,
                    actor_user_id=actor_user_id,
                    actor_employee_id=actor_employee_id,
                )

            db_request.approval_channel = "warehouse_provisioned" if provision_qty > 0 else "warehouse_standard"

        # Create warehouse approval record
        approval = WarehouseApproval(
            approval_id=get_next_sequence(session, WarehouseApproval, "approval_id", "WAP"),
            borrow_id=borrow_id,
            approved_by=actor_id,
            remarks=remarks,
            # Snapshot the request data for the receipt
            printable_payload_json={
                **db_request.model_dump(mode="json"),
                "provision_qty": provision_qty,
                "provisioned_units": provision_units,
            },
        )
        
        db_request.status = "warehouse_approved"
        
        # Log event
        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_id=db_request.borrow_id,
            event_type="warehouse_approved",
            actor_id=actor_id,
            actor_employee_id=actor_employee_id,
            note=remarks or (f"Provisioned quantity: {provision_qty}" if provision_qty > 0 else None),
        )
        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="warehouse_approve",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )
        
        session.add(approval)
        session.add(event)
        session.add(db_request)
        session.commit()
        session.refresh(approval)
        return approval

    def warehouse_reject(self, session: Session, borrow_id: str, actor_id: UUID, remarks: str | None = None, actor_user_id: str | None = None, actor_employee_id: str | None = None) -> BorrowRequest:
        db_request = self.get(session, borrow_id)
        if not db_request or db_request.status != "sent_to_warehouse":
            raise ValueError("Request must be in 'sent_to_warehouse' status")

        db_request.status = "warehouse_rejected"

        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_id=db_request.borrow_id,
            event_type="warehouse_rejected",
            actor_id=actor_id,
            actor_employee_id=actor_employee_id,
            note=remarks,
        )
        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.borrow_id,
            action="warehouse_reject",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
            actor_user_id=actor_user_id,
            actor_employee_id=actor_employee_id,
        )

        session.add(event)
        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request
