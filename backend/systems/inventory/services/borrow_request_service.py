from datetime import datetime
from sqlmodel import Session, select, func
from uuid import UUID

from core.base_service import BaseService
from systems.admin.models.user import User
from systems.inventory.models.borrow_request import BorrowRequest
from systems.inventory.models.borrow_request_event import BorrowRequestEvent
from systems.inventory.models.borrow_request_item import BorrowRequestItem
from systems.inventory.models.borrow_request_unit import BorrowRequestUnit
from systems.inventory.models.inventory import InventoryItem
from systems.inventory.schemas.borrow_request_schemas import (
    BorrowRequestCreate,
    BorrowRequestEventRead,
    BorrowRequestRead,
    BorrowRequestUnitReturn,
    BorrowRequestUpdate,
)
from systems.inventory.models.borrow_participant import BorrowParticipant
from systems.inventory.models.warehouse_approval import WarehouseApproval
from systems.inventory.services.inventory_service import InventoryService
from systems.inventory.services.configuration_service import (
    BorrowerConfigService,
    InventoryConfigService,
)
from systems.admin.services.user_service import UserService
from systems.admin.services.audit_service import audit_service
from utils.id_generator import get_next_sequence
from utils.time_utils import get_now_manila

_DEFAULT_STATUSES = [
    "pending",
    "approved",
    "sent_to_warehouse",
    "warehouse_approved",
    "released",
    "returned",
]


class BorrowService(
    BaseService[BorrowRequest, BorrowRequestCreate, BorrowRequestUpdate]
):
    def __init__(self):
        super().__init__(BorrowRequest, lookup_field="request_id")
        self.inventory_service = InventoryService()
        self.user_service = UserService()
        self.config_service = BorrowerConfigService()
        self.inventory_config_service = InventoryConfigService()

    def _require_setting(
        self,
        session: Session,
        key: str,
        table_name: str,
        field_name: str,
        field_label: str,
    ) -> None:
        self.config_service.require_table_field_key(
            session,
            key=key,
            table_name=table_name,
            field_name=field_name,
            field_label=field_label,
        )

    def _require_borrow_status(self, session: Session, status_key: str) -> None:
        category = self.config_service.category_for("borrow_requests", "status")
        if self.config_service.exists(session, status_key, category):
            return
        raise ValueError(
            f"Invalid borrow request status: '{status_key}'. Missing system setting "
            f"({category}, {status_key})."
        )

    def _get_workflow(self, session: Session) -> list[str]:
        settings = self.config_service.get_by_category(
            session,
            self.config_service.category_for("borrow_requests", "status"),
        )
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
        payload["request_channel"] = request_channel
        compliance_notes = payload.get("compliance_followup_notes")

        if is_emergency:
            payload["compliance_followup_required"] = True
            if not compliance_notes:
                if request_channel == "borrower_portal":
                    payload["compliance_followup_notes"] = (
                        "Emergency request from portal. Verify condition manually."
                    )
                else:
                    payload["compliance_followup_notes"] = (
                        "Emergency request. Verify condition manually."
                    )
        elif payload.get("compliance_followup_required") and not compliance_notes:
            payload["compliance_followup_notes"] = "Compliance follow-up required."

        return payload

    def _get_user_by_uuid(self, session: Session, user_id: UUID | None) -> User | None:
        if user_id is None:
            return None
        return session.exec(
            select(User).where(User.id == user_id, User.is_deleted.is_(False))
        ).first()

    def _get_item_by_uuid(
        self, session: Session, item_uuid: UUID | None
    ) -> InventoryItem | None:
        if item_uuid is None:
            return None
        return session.exec(
            select(InventoryItem).where(
                InventoryItem.id == item_uuid,
                InventoryItem.is_deleted.is_(False),
            )
        ).first()

    def _build_user_id_map(
        self, session: Session, user_ids: set[UUID | None]
    ) -> dict[UUID, str]:
        clean_ids = [uid for uid in user_ids if uid is not None]
        if not clean_ids:
            return {}

        users = session.exec(
            select(User).where(
                User.is_deleted.is_(False),
                User.id.in_(clean_ids),
            )
        ).all()
        return {user.id: user.user_id for user in users}

    def _build_item_id_map(
        self, session: Session, item_ids: set[UUID | None]
    ) -> dict[UUID, str]:
        clean_ids = [iid for iid in item_ids if iid is not None]
        if not clean_ids:
            return {}

        items = session.exec(
            select(InventoryItem).where(
                InventoryItem.is_deleted.is_(False),
                InventoryItem.id.in_(clean_ids),
            )
        ).all()
        return {item.id: item.item_id for item in items}

    def get_all(
        self,
        session: Session,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        request_channel: str | None = None,
        is_emergency: bool | None = None,
        borrower_id: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        returned_on_time: bool | None = None,
    ) -> tuple[list[BorrowRequest], int]:
        """Get all borrow requests with optional filters and pagination."""
        statement = select(BorrowRequest).where(BorrowRequest.is_deleted.is_(False))

        if status is not None:
            statement = statement.where(BorrowRequest.status == status)
        if request_channel is not None:
            statement = statement.where(BorrowRequest.request_channel == request_channel)
        if is_emergency is not None:
            statement = statement.where(BorrowRequest.is_emergency == is_emergency)
        if returned_on_time is not None:
            statement = statement.where(BorrowRequest.returned_on_time == returned_on_time)
        if date_from is not None:
            statement = statement.where(BorrowRequest.request_date >= date_from)
        if date_to is not None:
            statement = statement.where(BorrowRequest.request_date <= date_to)
        if borrower_id is not None:
            # Resolve borrower_id string to a UUID via join
            borrower = self.user_service.get(session, borrower_id)
            if not borrower:
                return [], 0
            statement = statement.where(BorrowRequest.borrower_uuid == borrower.id)

        count_statement = select(func.count()).select_from(statement.subquery())
        total_count = session.exec(count_statement).one()

        results = session.exec(
            statement.order_by(BorrowRequest.request_date.desc()).offset(skip).limit(limit)
        ).all()
        return list(results), total_count

    def get_by_borrower(
        self,
        session: Session,
        borrower_uuid: UUID,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        is_emergency: bool | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> tuple[list[BorrowRequest], int]:
        """Get all requests for a specific borrower with optional filters and pagination."""
        statement = (
            select(BorrowRequest)
            .where(
                BorrowRequest.borrower_uuid == borrower_uuid,
                BorrowRequest.is_deleted.is_(False),
            )
            .order_by(BorrowRequest.request_date.desc())
        )

        if status is not None:
            statement = statement.where(BorrowRequest.status == status)
        if is_emergency is not None:
            statement = statement.where(BorrowRequest.is_emergency == is_emergency)
        if date_from is not None:
            statement = statement.where(BorrowRequest.request_date >= date_from)
        if date_to is not None:
            statement = statement.where(BorrowRequest.request_date <= date_to)

        total_statement = select(func.count()).select_from(statement.subquery())

        total_count = session.exec(total_statement).one()
        items = session.exec(statement.offset(skip).limit(limit)).all()

        return list(items), total_count


    def serialize_borrow_request(
        self, session: Session, borrow_req: BorrowRequest
    ) -> BorrowRequestRead:
        actor_ids = {
            event.actor_id
            for event in (borrow_req.events or [])
            if event.actor_id is not None
        }
        actor_ids.add(borrow_req.borrower_uuid)
        user_id_map = self._build_user_id_map(session, actor_ids)

        # Get all items for this request
        request_items = []
        item_uuids = set()
        if borrow_req.id:
            request_items = session.exec(
                select(BorrowRequestItem)
                .where(
                    BorrowRequestItem.borrow_uuid == borrow_req.id,
                    BorrowRequestItem.is_deleted.is_(False),
                )
                .order_by(BorrowRequestItem.created_at.asc())
            ).all()
            item_uuids = {item.item_uuid for item in request_items if item.item_uuid}

        item_id_map = self._build_item_id_map(session, item_uuids)

        payload = borrow_req.model_dump(mode="json")
        payload["borrower_user_id"] = user_id_map.get(borrow_req.borrower_uuid)

        # Populate items list
        payload["items"] = [
            {
                "item_id": item_id_map.get(item.item_uuid),
                "qty_requested": item.qty_requested,
            }
            for item in request_items
        ]

        # Remove legacy fields from payload
        payload.pop("item_id", None)
        payload.pop("qty_requested", None)

        payload["events"] = [
            {
                **event.model_dump(mode="json"),
                "actor_user_id": user_id_map.get(event.actor_id),
            }
            for event in (borrow_req.events or [])
        ]
        return BorrowRequestRead.model_validate(payload)

    def serialize_borrow_requests(
        self,
        session: Session,
        borrow_requests: list[BorrowRequest],
    ) -> list[BorrowRequestRead]:
        return [
            self.serialize_borrow_request(session, request)
            for request in borrow_requests
        ]

    def serialize_borrow_events(
        self,
        session: Session,
        events: list[BorrowRequestEvent],
    ) -> list[BorrowRequestEventRead]:
        actor_ids = {event.actor_id for event in events if event.actor_id is not None}
        user_id_map = self._build_user_id_map(session, actor_ids)
        return [
            BorrowRequestEventRead.model_validate(
                {
                    **event.model_dump(mode="json"),
                    "actor_user_id": user_id_map.get(event.actor_id),
                }
            )
            for event in events
        ]

    def _get_borrow_assignments(
        self, session: Session, borrow_request: BorrowRequest
    ) -> list[BorrowRequestUnit]:
        if borrow_request.id is None:
            return []
        assignment_filter = BorrowRequestUnit.borrow_uuid == borrow_request.id

        return list(
            session.exec(
                select(BorrowRequestUnit)
                .where(
                    assignment_filter,
                    BorrowRequestUnit.is_deleted.is_(False),
                )
                .order_by(BorrowRequestUnit.created_at.asc())
            ).all()
        )

    def _validate_trackable_assignment_prerequisites(
        self,
        session: Session,
        db_request: BorrowRequest,
        borrow_item: BorrowRequestItem,
    ) -> list[BorrowRequestUnit]:
        item = borrow_item.inventory_item
        if not item.is_trackable:
            return []

        # Filter assignments that belong to this specific item
        assignments = [
            a
            for a in self._get_borrow_assignments(session, db_request)
            if a.inventory_unit and a.inventory_unit.inventory_uuid == item.id
        ]

        if len(assignments) != borrow_item.qty_requested:
            raise ValueError(
                f"Trackable item '{item.item_id}' requires exactly {borrow_item.qty_requested} assigned units before release, but found {len(assignments)}"
            )

        return assignments

    def _set_sent_to_warehouse(
        self,
        session: Session,
        db_request: BorrowRequest,
        actor_id: UUID,
        note: str | None = None,
        approval_channel: str = "warehouse_manual",
    ) -> None:
        self._require_borrow_status(session, "sent_to_warehouse")
        self._require_setting(
            session,
            key=approval_channel,
            table_name="borrow_requests",
            field_name="approval_channel",
            field_label="borrow approval channel",
        )
        self._require_setting(
            session,
            key="sent_to_warehouse",
            table_name="borrow_request_events",
            field_name="event_type",
            field_label="borrow request event type",
        )

        db_request.status = "sent_to_warehouse"
        db_request.approval_channel = approval_channel

        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_uuid=db_request.id,
            event_type="sent_to_warehouse",
            actor_id=actor_id,
            note=note,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.request_id,
            action="warehouse_send",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
        )
        session.add(event)
        session.add(db_request)

    def get_assigned_units(
        self, session: Session, request_id: str
    ) -> list[BorrowRequestUnit]:
        db_request = self.get(session, request_id)
        if not db_request:
            return []
        return self._get_borrow_assignments(session, db_request)

    def assign_units(
        self,
        session: Session,
        request_id: str,
        unit_ids: list[str],
        actor_id: UUID,
        note: str | None = None,
    ) -> list[BorrowRequestUnit]:
        db_request = self.get(session, request_id)
        if not db_request:
            raise ValueError("Request not found")

        if db_request.status not in {
            "approved",
            "sent_to_warehouse",
            "warehouse_approved",
        }:
            raise ValueError(
                "Units can only be assigned when request is approved, sent_to_warehouse, or warehouse_approved"
            )

        self._require_setting(
            session,
            key="units_assigned",
            table_name="borrow_request_events",
            field_name="event_type",
            field_label="borrow request event type",
        )

        normalized_unit_ids = [
            unit_id.strip() for unit_id in unit_ids if unit_id and unit_id.strip()
        ]
        if not normalized_unit_ids:
            return []
        if len(normalized_unit_ids) != len(unit_ids):
            raise ValueError("unit_ids must not contain empty values")
        if len(set(normalized_unit_ids)) != len(normalized_unit_ids):
            raise ValueError("unit_ids must be unique")

        # Get first unit to determine which item we are assigning to
        first_unit = self.inventory_service.get_unit(session, normalized_unit_ids[0])
        if not first_unit:
            raise ValueError(f"Unit {normalized_unit_ids[0]} not found")

        item_uuid = first_unit.inventory_uuid
        borrow_item = next(
            (i for i in db_request.items if i.item_uuid == item_uuid), None
        )
        if not borrow_item:
            raise ValueError(
                f"Item linked to unit {first_unit.unit_id} is not part of this borrow request"
            )

        item = borrow_item.inventory_item
        if not item.is_trackable:
            raise ValueError("Unit assignment is only applicable to trackable items")

        if len(normalized_unit_ids) != borrow_item.qty_requested:
            raise ValueError(
                f"Expected {borrow_item.qty_requested} units for item {item.item_id}, got {len(normalized_unit_ids)}"
            )

        # Check if units are already assigned for THIS item
        existing_assignments = [
            a
            for a in self._get_borrow_assignments(session, db_request)
            if a.inventory_unit and a.inventory_unit.inventory_uuid == item_uuid
        ]
        if existing_assignments:
            raise ValueError(
                f"Units are already assigned for item {item.item_id} in this request"
            )

        borrower = self._get_user_by_uuid(session, db_request.borrower_uuid)
        now = get_now_manila()
        created_assignments: list[BorrowRequestUnit] = []

        for unit_id in normalized_unit_ids:
            unit = self.inventory_service.get_unit(session, unit_id)
            if not unit:
                raise ValueError(f"Unit {unit_id} not found")

            if unit.inventory_uuid != item_uuid:
                raise ValueError(
                    f"Unit {unit_id} does not belong to item {item.item_id}"
                )
            if unit.status != "available":
                raise ValueError(f"Unit {unit_id} is not available for assignment")

            assignment = BorrowRequestUnit(
                borrow_unit_id=get_next_sequence(
                    session, BorrowRequestUnit, "borrow_unit_id", "BRU"
                ),
                borrow_uuid=db_request.id,
                unit_uuid=unit.id,
                requested_at=db_request.request_date,
                approved_at=db_request.approved_at,
                assigned_at=now,
                requested_by=borrower.id if borrower else None,
                approved_by=db_request.approved_by,
                assigned_by=actor_id,
            )
            session.add(assignment)
            created_assignments.append(assignment)

        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_uuid=db_request.id,
            event_type="units_assigned",
            actor_id=actor_id,
            note=note,
        )
        session.add(event)

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.request_id,
            action="assign_units",
            after={
                "request_id": db_request.request_id,
                "unit_ids": normalized_unit_ids,
            },
            actor_id=actor_id,
        )

        session.commit()
        for assignment in created_assignments:
            session.refresh(assignment)
        return created_assignments

    def create_request(
        self,
        session: Session,
        schema: BorrowRequestCreate,
        borrower_id: str,
        request_channel: str,
        actor_id: UUID | None = None,
    ) -> BorrowRequest:
        # Resolve borrower using the passed string ID (e.g., "ST-001")
        borrower = self.user_service.get(session, borrower_id)
        if not borrower:
            raise ValueError(f"Borrower {borrower_id} not found")

        items_by_id = {}
        for item_req in schema.items:
            item = self.inventory_service.get(session, item_req.item_id)
            if not item:
                raise ValueError(f"Item {item_req.item_id} not found")

            if item.available_qty < item_req.qty_requested:
                raise ValueError(
                    f"Insufficient stock for {item_req.item_id}. Available: {item.available_qty}"
                )

            items_by_id[item_req.item_id] = item

        active_request = session.exec(
            select(BorrowRequest).where(
                BorrowRequest.borrower_uuid == borrower.id,
                BorrowRequest.status.in_(self._active_statuses(session)),
                BorrowRequest.is_deleted.is_(False),
            )
        ).first()

        if active_request:
            raise ValueError("Borrower already has an active request")

        year = get_now_manila().year
        transaction_ref = get_next_sequence(
            session, self.model, "transaction_ref", f"TXN-{year}"
        )

        # Merge manual request_channel into data
        data = self._normalize_compliance_fields(
            {**schema.model_dump(), "request_channel": request_channel}
        )
        data["borrower_uuid"] = borrower.id

        # Clean up remaining fields that shouldn't go into BorrowRequest model
        data.pop("items", None)

        # Apply standard metadata requirements
        self._require_setting(
            session,
            key=str(data["request_channel"]),
            table_name="borrow_requests",
            field_name="request_channel",
            field_label="borrow request channel",
        )
        self._require_borrow_status(session, "pending")
        self._require_setting(
            session,
            key="created",
            table_name="borrow_request_events",
            field_name="event_type",
            field_label="borrow request event type",
        )
        data["transaction_ref"] = transaction_ref

        participants_data = data.pop("involved_people", [])

        if not data.get(self.lookup_field):
            data[self.lookup_field] = get_next_sequence(
                session, self.model, self.lookup_field, "REQ"
            )

        db_obj = self.model(**data)
        session.add(db_obj)

        # Create child item records
        for item_req in schema.items:
            item_obj = items_by_id[item_req.item_id]
            borrow_item = BorrowRequestItem(
                borrow_uuid=db_obj.id,
                item_uuid=item_obj.id,
                qty_requested=item_req.qty_requested,
            )
            session.add(borrow_item)

        if participants_data:
            for p in participants_data:
                participant_user_id = p.get("user_id")
                participant_user = (
                    self.user_service.get(session, participant_user_id)
                    if participant_user_id
                    else None
                )
                participant = BorrowParticipant(
                    borrow_uuid=db_obj.id,
                    user_uuid=participant_user.id if participant_user else None,
                    name=p.get("name") or p.get("fullname"),
                    role_in_request=p.get("role") or "witness",
                )
                self._require_setting(
                    session,
                    key=participant.role_in_request,
                    table_name="borrow_participants",
                    field_name="role_in_request",
                    field_label="borrow participant role",
                )
                session.add(participant)

        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_uuid=db_obj.id,
            event_type="created",
            actor_id=actor_id,
            note=schema.notes,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_obj.request_id,
            action="create",
            after=db_obj.model_dump(mode="json"),
            actor_id=actor_id,
        )
        session.add(event)

        session.commit()
        session.refresh(db_obj)
        return db_obj

    def approve_request(
        self,
        session: Session,
        request: str,
        actor_id: UUID,
        note: str | None = None,
        auto_route_shortage: bool = True,
    ) -> BorrowRequest:
        stage_0 = self._stage(session, 0)
        stage_1 = self._stage(session, 1)
        stage_2 = self._stage(session, 2)
        db_request = self.get(session, request)
        if not db_request or db_request.status != stage_0:
            raise ValueError(f"Request not found or not in '{stage_0}' status")

        # Check stock for all items
        shortages = []
        for borrow_item in db_request.items:
            item = borrow_item.inventory_item
            if not item:
                raise ValueError(f"Item record for {borrow_item.item_uuid} not found")

            if item.available_qty < borrow_item.qty_requested:
                shortages.append(
                    {
                        "item_id": item.item_id,
                        "requested": borrow_item.qty_requested,
                        "available": item.available_qty,
                        "shortage": borrow_item.qty_requested - item.available_qty,
                    }
                )

        if shortages and not auto_route_shortage:
            shortage_msg = "; ".join(
                [
                    f"{s['item_id']}: req {s['requested']}, avail {s['available']}"
                    for s in shortages
                ]
            )
            raise ValueError(
                f"Insufficient stock for approval: {shortage_msg}. Route to warehouse first."
            )

        self._require_borrow_status(session, stage_1)
        self._require_setting(
            session,
            key="standard",
            table_name="borrow_requests",
            field_name="approval_channel",
            field_label="borrow approval channel",
        )
        self._require_setting(
            session,
            key="approved",
            table_name="borrow_request_events",
            field_name="event_type",
            field_label="borrow request event type",
        )

        db_request.status = stage_1
        db_request.approval_channel = "standard"
        db_request.approved_by = actor_id
        db_request.approved_at = get_now_manila()

        if shortages:
            self._require_borrow_status(session, stage_2)
            db_request.status = stage_2
            shortage_info = ", ".join(
                [f"{s['item_id']} (shortage: {s['shortage']})" for s in shortages]
            )
            warehouse_note = (
                note or f"Auto-routed to warehouse due to shortages: {shortage_info}"
            )

            self._set_sent_to_warehouse(
                session,
                db_request,
                actor_id,
                note=warehouse_note,
                approval_channel="warehouse_shortage_auto",
            )

        # Log event
        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_uuid=db_request.id,
            event_type="approved",
            actor_id=actor_id,
            note=note,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.request_id,
            action="approve",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
        )
        session.add(event)

        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def reject_request(
        self,
        session: Session,
        request_id: str,
        actor_id: UUID,
        note: str | None = None,
    ) -> BorrowRequest:
        stage_0 = self._stage(session, 0)
        db_request = self.get(session, request_id)
        if not db_request or db_request.status != stage_0:
            raise ValueError(f"Request not found or not in '{stage_0}' status")

        self._require_borrow_status(session, "rejected")
        self._require_setting(
            session,
            key="rejected",
            table_name="borrow_request_events",
            field_name="event_type",
            field_label="borrow request event type",
        )
        db_request.status = "rejected"

        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_uuid=db_request.id,
            event_type="rejected",
            actor_id=actor_id,
            note=note,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.request_id,
            action="reject",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
        )
        session.add(event)

        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def release_request(
        self,
        session: Session,
        request_id: str,
        actor_id: UUID,
        note: str | None = None,
    ) -> BorrowRequest:
        stage_approved = self._stage(session, 1)
        stage_warehouse_approved = self._stage(session, 3)
        stage_released = self._stage(session, 4)
        db_request = self.get(session, request_id)
        if not db_request:
            raise ValueError("Request not found")

        is_emergency_bypass = (
            db_request.is_emergency and db_request.status == stage_approved
        )
        is_direct_release = (
            db_request.status == stage_approved and not db_request.is_emergency
        )
        is_warehouse_release = db_request.status == stage_warehouse_approved
        if not (is_emergency_bypass or is_direct_release or is_warehouse_release):
            raise ValueError(
                f"Request not found or not in '{stage_approved}' or '{stage_warehouse_approved}' status"
            )

        now = get_now_manila()

        for borrow_item in db_request.items:
            item = borrow_item.inventory_item
            if not item:
                raise ValueError(
                    f"Inventory item record for {borrow_item.item_uuid} not found"
                )

            if is_direct_release and item.available_qty < borrow_item.qty_requested:
                raise ValueError(
                    f"Insufficient stock for item {item.item_id}. Direct release requires all items to be in stock."
                )

            if item.is_trackable:
                assignments = self._validate_trackable_assignment_prerequisites(
                    session, db_request, borrow_item
                )
                for assignment in assignments:
                    unit = assignment.inventory_unit
                    if not unit:
                        raise ValueError(
                            f"Assigned unit for assignment {assignment.borrow_unit_id} not found"
                        )
                    if unit.status != "available":
                        raise ValueError(
                            f"Assigned unit {unit.unit_id} is not available for release"
                        )

                    self.inventory_service._validate_status_transition(
                        session, unit.status, "borrowed"
                    )
                    unit.status = "borrowed"
                    assignment.released_at = now
                    assignment.released_by = actor_id

                    if assignment.approved_by is None:
                        assignment.approved_by = db_request.approved_by
                        assignment.approved_at = db_request.approved_at

                    session.add(unit)
                    session.add(assignment)
            else:
                self._require_setting(
                    session,
                    key="unit_assignment_skipped",
                    table_name="borrow_request_events",
                    field_name="event_type",
                    field_label="borrow request event type",
                )
                skip_event = BorrowRequestEvent(
                    event_id=get_next_sequence(
                        session, BorrowRequestEvent, "event_id", "BRE"
                    ),
                    borrow_uuid=db_request.id,
                    event_type="unit_assignment_skipped",
                    actor_id=actor_id,
                    note=f"Unit assignment skipped for non-trackable item {item.item_id}",
                )
                session.add(skip_event)

            self.inventory_service.adjust_stock(
                session,
                item.item_id,
                -borrow_item.qty_requested,
                movement_type="borrow_release",
                reference_id=db_request.request_id,
                actor_id=actor_id,
            )

        self._require_borrow_status(session, stage_released)
        self._require_setting(
            session,
            key="released",
            table_name="borrow_request_events",
            field_name="event_type",
            field_label="borrow request event type",
        )
        db_request.status = stage_released
        if is_emergency_bypass:
            self._require_setting(
                session,
                key="emergency_bypass",
                table_name="borrow_requests",
                field_name="approval_channel",
                field_label="borrow approval channel",
            )
            db_request.approval_channel = "emergency_bypass"
        db_request.released_by = actor_id
        db_request.released_at = now

        # Log event
        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_uuid=db_request.id,
            event_type="released",
            actor_id=actor_id,
            note=note
            or (
                "Emergency release bypassed warehouse stage"
                if is_emergency_bypass
                else None
            ),
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.request_id,
            action="release",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
        )
        session.add(event)

        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def return_request(
        self,
        session: Session,
        request_id: str,
        actor_id: UUID,
        note: str | None = None,
        unit_returns: list[BorrowRequestUnitReturn] | None = None,
    ) -> BorrowRequest:
        stage_4 = self._stage(session, 4)
        stage_5 = self._stage(session, 5)
        db_request = self.get(session, request_id)
        if not db_request or db_request.status != stage_4:
            raise ValueError(f"Request not found or not in '{stage_4}' status")

        unit_return_map = {
            unit_return.unit_id: unit_return for unit_return in (unit_returns or [])
        }

        for borrow_item in db_request.items:
            item = borrow_item.inventory_item
            if not item:
                raise ValueError(
                    f"Inventory item record for {borrow_item.item_uuid} not found"
                )

            if item.is_trackable:
                assignments = self._validate_trackable_assignment_prerequisites(
                    session, db_request, borrow_item
                )
                for assignment in assignments:
                    unit = assignment.inventory_unit
                    if not unit:
                        raise ValueError(
                            f"Assigned unit {assignment.borrow_unit_id} not found"
                        )
                    if unit.status != "borrowed":
                        raise ValueError(
                            f"Assigned unit {unit.unit_id} is not marked as borrowed"
                        )

                    return_data = unit_return_map.get(unit.unit_id)
                    status_on_return = (
                        return_data.status_on_return if return_data else None
                    )
                    if status_on_return is None:
                        if (
                            return_data
                            and return_data.condition
                            and return_data.condition.lower()
                            in {"damaged", "for_repair", "repair"}
                        ):
                            status_on_return = "maintenance"
                        else:
                            status_on_return = "available"

                    self.inventory_service._validate_status_transition(
                        session, unit.status, status_on_return
                    )
                    unit.status = status_on_return
                    if return_data and return_data.condition is not None:
                        self._require_setting(
                            session,
                            key=return_data.condition,
                            table_name="inventory_units",
                            field_name="condition",
                            field_label="inventory unit condition",
                        )
                        unit.condition = return_data.condition

                    assignment.returned_at = get_now_manila()
                    assignment.returned_by = actor_id
                    assignment.condition_on_return = (
                        return_data.condition if return_data else None
                    )
                    assignment.return_notes = return_data.notes if return_data else None

                    session.add(unit)
                    session.add(assignment)

            self.inventory_service.adjust_stock(
                session,
                item.item_id,
                borrow_item.qty_requested,
                movement_type="borrow_return",
                reference_id=db_request.request_id,
                actor_id=actor_id,
            )

        now = get_now_manila()
        self._require_borrow_status(session, stage_5)
        self._require_setting(
            session,
            key="returned",
            table_name="borrow_request_events",
            field_name="event_type",
            field_label="borrow request event type",
        )
        db_request.status = stage_5
        db_request.returned_by = actor_id
        db_request.received_by = actor_id
        db_request.returned_at = now

        # Calculate returned_on_time
        if db_request.return_at:
            db_request.returned_on_time = now <= db_request.return_at
        else:
            db_request.returned_on_time = True

        # Log event
        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_uuid=db_request.id,
            event_type="returned",
            actor_id=actor_id,
            note=note,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.request_id,
            action="return",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
        )
        session.add(event)

        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def reopen_request(
        self,
        session: Session,
        request_id: str,
        actor_id: UUID,
        note: str | None = None,
    ) -> BorrowRequest:
        pending_stage = self._stage(session, 0)
        db_request = self.get(session, request_id)
        if not db_request or db_request.status not in {
            "rejected",
            "warehouse_rejected",
        }:
            raise ValueError(
                "Request must be in 'rejected' or 'warehouse_rejected' status"
            )

        duplicate_active_request = session.exec(
            select(BorrowRequest).where(
                BorrowRequest.borrower_uuid == db_request.borrower_uuid,
                BorrowRequest.is_deleted.is_(False),
                BorrowRequest.status.in_(self._active_statuses(session)),
                BorrowRequest.id != db_request.id,
            )
        ).first()
        if duplicate_active_request:
            raise ValueError(
                "Cannot reopen request while another active request for this borrower exists"
            )

        self._require_borrow_status(session, pending_stage)
        self._require_setting(
            session,
            key="reopened",
            table_name="borrow_request_events",
            field_name="event_type",
            field_label="borrow request event type",
        )
        db_request.status = pending_stage

        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_uuid=db_request.id,
            event_type="reopened",
            actor_id=actor_id,
            note=note,
        )

        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.request_id,
            action="reopen",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
        )
        session.add(event)

        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request

    def send_to_warehouse(
        self,
        session: Session,
        request_id: str,
        actor_id: UUID,
        note: str | None = None,
    ) -> BorrowRequest:
        stage_1 = self._stage(session, 1)
        db_request = self.get(session, request_id)
        if not db_request or db_request.status != stage_1:
            raise ValueError(
                f"Request must be in '{stage_1}' status to be sent to warehouse"
            )

        self._set_sent_to_warehouse(
            session,
            db_request,
            actor_id,
            note=note,
            approval_channel="warehouse_manual",
        )
        session.commit()
        session.refresh(db_request)
        return db_request

    def auto_route_to_warehouse(
        self,
        session: Session,
        request_id: str,
        actor_id: UUID,
        note: str | None = None,
    ) -> BorrowRequest:
        stage_1 = self._stage(session, 1)
        db_request = self.get(session, request_id)
        if not db_request or db_request.status != stage_1:
            raise ValueError(f"Request must be in '{stage_1}' status")

        # Check all items for shortages
        shortages = []
        for borrow_item in db_request.items:
            item = borrow_item.inventory_item
            if item and item.available_qty < borrow_item.qty_requested:
                shortages.append(
                    {
                        "item_id": item.item_id,
                        "requested": borrow_item.qty_requested,
                        "available": item.available_qty,
                        "shortage": borrow_item.qty_requested - item.available_qty,
                    }
                )

        if not shortages:
            # If no shortages, don't route automatically
            return db_request

        self._require_borrow_status(session, "sent_to_warehouse")
        shortage_info = ", ".join(
            [f"{s['item_id']} (shortage: {s['shortage']})" for s in shortages]
        )
        final_note = (
            note or f"Auto-routed to warehouse due to shortages: {shortage_info}"
        )
        self._set_sent_to_warehouse(
            session,
            db_request,
            actor_id,
            note=final_note,
            approval_channel="warehouse_shortage_auto",
        )
        session.commit()
        session.refresh(db_request)
        return db_request

    def warehouse_approve(
        self,
        session: Session,
        request_id: str,
        actor_id: UUID,
        remarks: str | None = None,
    ) -> WarehouseApproval:
        return self.warehouse_approve_with_provision(
            session=session,
            request_id=request_id,
            actor_id=actor_id,
            remarks=remarks,
            provision_qty=0,
            units_data=None,
        )

    def warehouse_approve_with_provision(
        self,
        session: Session,
        request_id: str,
        actor_id: UUID,
        remarks: str | None = None,
        provision_qty: int = 0,
        units_data: list[dict] | None = None,
        item_id: str | None = None,  # Added to disambiguate provisioning
    ) -> WarehouseApproval:
        db_request = self.get(session, request_id)
        if not db_request or db_request.status != "sent_to_warehouse":
            raise ValueError("Request must be in 'sent_to_warehouse' status")

        item = None
        if provision_qty > 0:
            if item_id:
                borrow_item = next(
                    (
                        i
                        for i in db_request.items
                        if i.inventory_item and i.inventory_item.item_id == item_id
                    ),
                    None,
                )
                if not borrow_item:
                    raise ValueError(
                        f"Item {item_id} is not part of this borrow request"
                    )
                item = borrow_item.inventory_item
            else:
                if len(db_request.items) == 1:
                    item = db_request.items[0].inventory_item
                else:
                    raise ValueError(
                        "item_id must be provided for provisioning in a multi-item request"
                    )

        if item:
            if provision_qty < 0:
                raise ValueError("provision_qty cannot be negative")

            provision_units = units_data or []
            if (
                item.is_trackable
                and provision_qty > 0
                and len(provision_units) != provision_qty
            ):
                raise ValueError(
                    f"Trackable item provisioning requires exactly {provision_qty} unit records"
                )
            if not item.is_trackable and provision_units:
                raise ValueError("Units payload is only valid for trackable items")

            if provision_qty > 0:
                self.inventory_service.adjust_stock(
                    session,
                    item.item_id,
                    provision_qty,
                    movement_type="procurement",
                    reference_id=db_request.request_id,
                    note=remarks
                    or f"Warehouse provisioned {provision_qty} units during approval",
                    actor_id=actor_id,
                )

                if item.is_trackable:
                    self.inventory_service.create_units_batch(
                        session,
                        item_id=item.item_id,
                        units_data=provision_units,
                        actor_id=actor_id,
                    )

                next_channel = (
                    "warehouse_provisioned"
                    if provision_qty > 0
                    else "warehouse_standard"
                )
                self._require_setting(
                    session,
                    key=next_channel,
                    table_name="borrow_requests",
                    field_name="approval_channel",
                    field_label="borrow approval channel",
                )
                db_request.approval_channel = next_channel

        session.flush()
        borrower = self._get_user_by_uuid(session, db_request.borrower_uuid)

        # Build multi-item snapshot
        items_snapshot = []
        for b_item in db_request.items:
            inv_item = b_item.inventory_item
            if inv_item:
                items_snapshot.append(
                    {
                        "item_id": inv_item.item_id,
                        "item_name": inv_item.name,
                        "qty_requested": b_item.qty_requested,
                        "available_qty": inv_item.available_qty,
                        "total_qty": inv_item.total_qty,
                        "is_trackable": inv_item.is_trackable,
                    }
                )

        approval = WarehouseApproval(
            approval_id=get_next_sequence(session, WarehouseApproval, "approval_id", "WAP"),
            request_id=request_id,
            borrow_uuid=db_request.id,
            approved_by=actor_id,
            remarks=remarks,
            printable_payload_json={
                "request_id": db_request.request_id,
                "borrower_id": borrower.user_id if borrower else None,
                "approval_channel": db_request.approval_channel or "warehouse_standard",
                "is_emergency": db_request.is_emergency,
                "items": items_snapshot,
                "provisioned_item_id": item.item_id if item else None,
                "provision_qty": provision_qty,
                "provisioned_units": [
                    {
                        "serial_number": u.get("serial_number"),
                        "internal_ref": u.get("internal_ref"),
                        "condition": u.get("condition", "good"),
                    }
                    for u in (units_data or [])
                ],
                "approved_at": get_now_manila().isoformat(),
                "remarks": remarks,
                "snapshot_version": "2.0",
                "snapshot_type": "warehouse_approval_compliance_receipt_multi_item",
            },
        )

        self._require_borrow_status(session, "warehouse_approved")
        self._require_setting(
            session,
            key="warehouse_approved",
            table_name="borrow_request_events",
            field_name="event_type",
            field_label="borrow request event type",
        )
        db_request.status = "warehouse_approved"

        # Log event
        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_uuid=db_request.id,
            event_type="warehouse_approved",
            actor_id=actor_id,
            note=remarks
            or (
                f"Provisioned quantity: {provision_qty}" if provision_qty > 0 else None
            ),
        )
        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.request_id,
            action="warehouse_approve",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
        )

        session.add(approval)
        session.add(event)
        session.add(db_request)
        session.commit()
        session.refresh(approval)
        return approval

    def warehouse_reject(
        self,
        session: Session,
        request_id: str,
        actor_id: UUID,
        remarks: str | None = None,
    ) -> BorrowRequest:
        db_request = self.get(session, request_id)
        if not db_request or db_request.status != "sent_to_warehouse":
            raise ValueError("Request must be in 'sent_to_warehouse' status")

        self._require_borrow_status(session, "warehouse_rejected")
        self._require_setting(
            session,
            key="warehouse_rejected",
            table_name="borrow_request_events",
            field_name="event_type",
            field_label="borrow request event type",
        )
        db_request.status = "warehouse_rejected"

        event = BorrowRequestEvent(
            event_id=get_next_sequence(session, BorrowRequestEvent, "event_id", "BRE"),
            borrow_uuid=db_request.id,
            event_type="warehouse_rejected",
            actor_id=actor_id,
            note=remarks,
        )
        audit_service.log_action(
            db=session,
            entity_type="borrow",
            entity_id=db_request.request_id,
            action="warehouse_reject",
            after=db_request.model_dump(mode="json"),
            actor_id=actor_id,
        )

        session.add(event)
        session.add(db_request)
        session.commit()
        session.refresh(db_request)
        return db_request
