import io
import csv
import json
from collections import defaultdict
from datetime import date, datetime
from typing import List, Any, Optional
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import aliased
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
from sqlmodel import Session, select
from fastapi.responses import StreamingResponse

from core.models.audit_log import AuditLog
from systems.inventory.models.borrow_request import BorrowRequest
from systems.inventory.models.borrow_request_item import BorrowRequestItem
from systems.inventory.models.borrow_request_unit import BorrowRequestUnit
from systems.inventory.models.inventory import InventoryItem
from systems.inventory.models.inventory_unit import InventoryUnit
from systems.inventory.models.inventory_batch import InventoryBatch
from systems.inventory.schemas.import_export_schemas import TimelineMode
from utils.time_utils import normalize_time_window

class ExportService:
    _FORMULA_PREFIXES = ("=", "+", "-", "@")
    _CONTROL_PREFIXES = ("\t", "\r", "\n")
    _MAX_QUERY_ROWS = 5000
    _MAX_RECEIPT_RENDER_ROWS = 1000
    _MAX_EXPORT_ITEMS = 2000
    _MAX_EXPORT_ROWS = 20000
    _RECEIPT_EXPORT_KEYS = (
        "request_id",
        "transaction_ref",
        "receipt_number",
        "borrower_name",
        "borrower_user_id",
        "customer_name",
        "location_name",
        "released_at",
        "released_by_name",
        "expected_return_at",
        "is_emergency",
        "approval_channel",
        "notes",
        "items",
    )
    _RECEIPT_EXPORT_ITEM_KEYS = (
        "item_id",
        "name",
        "classification",
        "qty_released",
        "serial_numbers",
    )

    def _sanitize_export_cell(self, value: Any) -> Any:
        if not isinstance(value, str) or not value:
            return value

        if value.startswith(self._FORMULA_PREFIXES):
            return f"'{value}"

        # Neutralize tab/newline/carriage-return prefixed variants that spreadsheet apps may interpret.
        if value.startswith(self._CONTROL_PREFIXES):
            return f"'{value}"

        first_non_whitespace = next((char for char in value if not char.isspace()), "")
        if first_non_whitespace in self._FORMULA_PREFIXES:
            return f"'{value}"

        return value

    def _sanitize_export_rows(self, rows: List[List[Any]]) -> List[List[Any]]:
        return [
            [self._sanitize_export_cell(value) for value in row]
            for row in rows
        ]

    def _apply_visibility_filters(
        self,
        statement: Any,
        model: type[Any],
        include_deleted: bool,
        include_archived: bool,
    ) -> Any:
        if not include_deleted and hasattr(model, "is_deleted"):
            statement = statement.where(model.is_deleted.is_(False))
        if not include_archived and hasattr(model, "is_archived"):
            statement = statement.where(model.is_archived.is_(False))
        return statement

    def _has_filter_value(self, value: Any) -> bool:
        if value is None:
            return False
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return bool(value.strip())
        if isinstance(value, (list, tuple, set, dict)):
            return len(value) > 0
        return True

    def _reject_unsupported_filters(
        self,
        export_name: str,
        filters: dict[str, Any],
    ) -> None:
        unsupported = sorted(
            name for name, value in filters.items() if self._has_filter_value(value)
        )
        if unsupported:
            joined = ", ".join(unsupported)
            raise ValueError(
                f"Unsupported filter(s) for {export_name} export: {joined}."
            )

    def _resolve_time_window(
        self,
        timeline_mode: TimelineMode | None,
        anchor_date: date | None,
        date_from: datetime | None,
        date_to: datetime | None,
    ) -> tuple[datetime | None, datetime | None]:
        window = normalize_time_window(
            timeline_mode=timeline_mode,
            anchor_date=anchor_date,
            date_from=date_from,
            date_to=date_to,
        )
        return window.date_from, window.date_to

    def _apply_datetime_window(
        self,
        statement: Any,
        column: Any,
        date_from: datetime | None,
        date_to: datetime | None,
    ) -> Any:
        if date_from:
            statement = statement.where(column >= date_from)
        if date_to:
            statement = statement.where(column <= date_to)
        return statement

    def _execute_bounded_query(
        self,
        session: Session,
        statement: Any,
        limit: int,
        entity_label: str,
    ) -> list[Any]:
        rows = session.exec(statement.limit(limit + 1)).all()
        if len(rows) > limit:
            raise ValueError(
                f"Export limit exceeded for {entity_label}. Maximum {limit} rows per export."
            )
        return rows

    def _append_inventory_row(self, rows: List[List[Any]], row: List[Any]) -> None:
        if len(rows) >= self._MAX_EXPORT_ROWS:
            raise ValueError(
                f"Export limit exceeded for inventory rows. Maximum {self._MAX_EXPORT_ROWS} rows per export."
            )
        rows.append(row)

    def _resolve_inventory_unit_by_serial(
        self,
        session: Session,
        serial_number: str,
        include_deleted: bool,
        include_archived: bool,
    ) -> InventoryUnit | None:
        statement = select(InventoryUnit).where(InventoryUnit.serial_number == serial_number)
        statement = self._apply_visibility_filters(
            statement,
            InventoryUnit,
            include_deleted,
            include_archived,
        )
        return session.exec(statement).first()

    def _get_item_count_by_request_id(
        self,
        session: Session,
        request_ids: list[Any],
        include_deleted: bool,
        include_archived: bool,
    ) -> dict[Any, int]:
        if not request_ids:
            return {}

        item_count_statement = select(
            BorrowRequestItem.borrow_uuid,
            func.count(BorrowRequestItem.id),
        ).where(BorrowRequestItem.borrow_uuid.in_(request_ids))
        item_count_statement = self._apply_visibility_filters(
            item_count_statement,
            BorrowRequestItem,
            include_deleted,
            include_archived,
        ).group_by(BorrowRequestItem.borrow_uuid)

        return {
            borrow_uuid: count
            for borrow_uuid, count in session.exec(item_count_statement).all()
            if borrow_uuid is not None
        }

    def _get_unambiguous_borrow_request_ids_for_unit(
        self,
        session: Session,
        unit: InventoryUnit,
        include_deleted: bool,
        include_archived: bool,
    ) -> set[str]:
        request_uuid_statement = select(BorrowRequestUnit.borrow_uuid).join(
            BorrowRequest,
            BorrowRequestUnit.borrow_uuid == BorrowRequest.id,
        ).where(
            BorrowRequestUnit.unit_uuid == unit.id,
        )
        request_uuid_statement = self._apply_visibility_filters(
            request_uuid_statement,
            BorrowRequestUnit,
            include_deleted,
            include_archived,
        )
        request_uuid_statement = self._apply_visibility_filters(
            request_uuid_statement,
            BorrowRequest,
            include_deleted,
            include_archived,
        )

        request_uuids = [
            request_uuid
            for request_uuid in self._execute_bounded_query(
                session,
                request_uuid_statement,
                self._MAX_QUERY_ROWS,
                "serial-linked borrow request IDs",
            )
            if request_uuid is not None
        ]
        if not request_uuids:
            return set()

        request_unit_count_statement = (
            select(
                BorrowRequestUnit.borrow_uuid,
                func.count(func.distinct(BorrowRequestUnit.unit_uuid)),
            )
            .join(BorrowRequest, BorrowRequestUnit.borrow_uuid == BorrowRequest.id)
            .where(BorrowRequestUnit.borrow_uuid.in_(request_uuids))
            .group_by(BorrowRequestUnit.borrow_uuid)
        )
        request_unit_count_statement = self._apply_visibility_filters(
            request_unit_count_statement,
            BorrowRequestUnit,
            include_deleted,
            include_archived,
        )
        request_unit_count_statement = self._apply_visibility_filters(
            request_unit_count_statement,
            BorrowRequest,
            include_deleted,
            include_archived,
        )

        unambiguous_request_uuids = [
            borrow_uuid
            for borrow_uuid, unit_count in self._execute_bounded_query(
                session,
                request_unit_count_statement,
                self._MAX_QUERY_ROWS,
                "serial-linked borrow request unit counts",
            )
            if borrow_uuid is not None and unit_count == 1
        ]
        if not unambiguous_request_uuids:
            return set()

        request_id_statement = select(BorrowRequest.request_id).where(
            BorrowRequest.id.in_(unambiguous_request_uuids)
        )
        request_id_statement = self._apply_visibility_filters(
            request_id_statement,
            BorrowRequest,
            include_deleted,
            include_archived,
        )
        return {
            request_id
            for request_id in self._execute_bounded_query(
                session,
                request_id_statement,
                self._MAX_QUERY_ROWS,
                "serial-linked borrow request IDs",
            )
            if request_id is not None
        }

    def _format_timestamp(self, value: datetime | None) -> str:
        if value is None:
            return "N/A"
        return value.strftime("%Y-%m-%d %H:%M:%S")

    def _build_receipt_export_payload(self, receipt_payload: dict[str, Any]) -> dict[str, Any]:
        export_payload: dict[str, Any] = {
            key: receipt_payload.get(key)
            for key in self._RECEIPT_EXPORT_KEYS
            if key in receipt_payload and key != "items"
        }

        raw_items = receipt_payload.get("items")
        export_payload["items"] = [
            {
                item_key: item_payload.get(item_key)
                for item_key in self._RECEIPT_EXPORT_ITEM_KEYS
                if item_key in item_payload
            }
            for item_payload in raw_items
            if isinstance(item_payload, dict)
        ] if isinstance(raw_items, list) else []

        return export_payload

    def _get_receipt_rendered_payload(self, receipt_service: Any, session: Session, request_id: str) -> str:
        try:
            receipt = receipt_service.generate_release_receipt(session, request_id)
        except ValueError:
            return ""

        if hasattr(receipt, "model_dump"):
            receipt_payload = receipt.model_dump(mode="json")
        else:
            receipt_payload = receipt

        if isinstance(receipt_payload, dict):
            return json.dumps(self._build_receipt_export_payload(receipt_payload))
        return json.dumps(receipt_payload)

    def export_audit_logs(
        self, 
        session: Session, 
        format: str, 
        from_date: Optional[datetime] = None, 
        to_date: Optional[datetime] = None,
        timeline_mode: TimelineMode | None = None,
        anchor_date: date | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        include_deleted: bool = False,
        include_archived: bool = False,
    ) -> StreamingResponse:
        effective_from_date = date_from or from_date
        effective_to_date = date_to or to_date
        normalized_from_date, normalized_to_date = self._resolve_time_window(
            timeline_mode=timeline_mode,
            anchor_date=anchor_date,
            date_from=effective_from_date,
            date_to=effective_to_date,
        )

        statement = select(AuditLog)
        statement = self._apply_visibility_filters(
            statement,
            AuditLog,
            include_deleted,
            include_archived,
        )
        statement = self._apply_datetime_window(
            statement,
            AuditLog.created_at,
            normalized_from_date,
            normalized_to_date,
        )
            
        logs = self._execute_bounded_query(
            session,
            statement,
            self._MAX_QUERY_ROWS,
            "audit logs",
        )
        
        headers = ["ID", "Action", "Entity ID", "Entity Type", "Actor", "Timestamp", "Reason"]
        data = [
            [
                str(log.id),
                log.action,
                log.entity_id,
                log.entity_type,
                str(log.actor_id),
                log.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                log.reason_code or ""
            ]
            for log in logs
        ]
        
        return self._create_response(headers, data, format, "audit_logs")

    def export_inventory(
        self, 
        session: Session, 
        format: str,
        timeline_mode: TimelineMode | None = None,
        anchor_date: date | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        include_deleted: bool = False,
        include_archived: bool = False,
    ) -> StreamingResponse:
        normalized_from_date, normalized_to_date = self._resolve_time_window(
            timeline_mode=timeline_mode,
            anchor_date=anchor_date,
            date_from=date_from,
            date_to=date_to,
        )

        headers = ["name", "category", "classification", "item_type", "is_trackable", "description", "condition", "quantity", "serial_number", "expiration_date"]
        
        # We export a row for each unit (if trackable) or each batch (if not)
        data = []
        items_statement = self._apply_visibility_filters(
            select(InventoryItem),
            InventoryItem,
            include_deleted,
            include_archived,
        )
        items_statement = self._apply_datetime_window(
            items_statement,
            InventoryItem.created_at,
            normalized_from_date,
            normalized_to_date,
        )
        items = self._execute_bounded_query(
            session,
            items_statement,
            self._MAX_EXPORT_ITEMS,
            "inventory items",
        )

        trackable_item_ids = [item.id for item in items if item.is_trackable]
        non_trackable_item_ids = [item.id for item in items if not item.is_trackable]

        units_by_item_id: dict[Any, list[InventoryUnit]] = defaultdict(list)
        if trackable_item_ids:
            units_statement = select(InventoryUnit).where(
                InventoryUnit.inventory_uuid.in_(trackable_item_ids)
            )
            units_statement = self._apply_visibility_filters(
                units_statement,
                InventoryUnit,
                include_deleted,
                include_archived,
            )
            units = self._execute_bounded_query(
                session,
                units_statement,
                self._MAX_EXPORT_ROWS,
                "inventory units",
            )
            for unit in units:
                units_by_item_id[unit.inventory_uuid].append(unit)

        batches_by_item_id: dict[Any, list[InventoryBatch]] = defaultdict(list)
        if non_trackable_item_ids:
            batches_statement = select(InventoryBatch).where(
                InventoryBatch.inventory_uuid.in_(non_trackable_item_ids)
            )
            batches_statement = self._apply_visibility_filters(
                batches_statement,
                InventoryBatch,
                include_deleted,
                include_archived,
            )
            batches = self._execute_bounded_query(
                session,
                batches_statement,
                self._MAX_EXPORT_ROWS,
                "inventory batches",
            )
            for batch in batches:
                batches_by_item_id[batch.inventory_uuid].append(batch)

        for item in items:
            if item.is_trackable:
                units = units_by_item_id.get(item.id, [])
                if not units:
                    self._append_inventory_row(data, [
                        item.name,
                        item.category or "",
                        item.classification or "",
                        item.item_type or "",
                        "true",
                        "",
                        "",
                        "0",
                        "",
                        ""
                    ])
                for unit in units:
                    self._append_inventory_row(data, [
                        item.name,
                        item.category or "",
                        item.classification or "",
                        item.item_type or "",
                        "true",
                        unit.description or "",
                        unit.condition,
                        "1",
                        unit.serial_number,
                        unit.expiration_date.isoformat() if unit.expiration_date else ""
                    ])
            else:
                batches = batches_by_item_id.get(item.id, [])
                if not batches:
                    self._append_inventory_row(data, [
                        item.name,
                        item.category or "",
                        item.classification or "",
                        item.item_type or "",
                        "false",
                        "",
                        "",
                        "0",
                        "",
                        ""
                    ])
                for batch in batches:
                    self._append_inventory_row(data, [
                        item.name,
                        item.category or "",
                        item.classification or "",
                        item.item_type or "",
                        "false",
                        batch.description or "",
                        "",
                        str(batch.total_qty),
                        "",
                        batch.expiration_date.isoformat() if batch.expiration_date else ""
                    ])
      
        return self._create_response(headers, data, format, "inventory_export")

    def export_borrow_history(
        self, 
        session: Session, 
        format: str, 
        status: Optional[str] = None,
        item_id: Optional[str] = None,
        borrower_id: Optional[str] = None,
        serial_number: Optional[str] = None,
        include_receipt_rendered: bool = False,
        timeline_mode: TimelineMode | None = None,
        anchor_date: date | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        include_deleted: bool = False,
        include_archived: bool = False,
    ) -> StreamingResponse:
        normalized_from_date, normalized_to_date = self._resolve_time_window(
            timeline_mode=timeline_mode,
            anchor_date=anchor_date,
            date_from=date_from,
            date_to=date_to,
        )

        from systems.admin.models.user import User
        headers = [
            "Request ID",
            "Borrower Name + Employee ID",
            "Item Name",
            "Serial Number",
            "Who approved the request",
            "Who assigned the unit",
            "Unit CONDITION on release",
            "Who released",
            "When released",
            "When returned",
            "Who received the return",
            "Unit CONDITION on return",
        ]
        receipt_service: Any | None = None
        receipt_payload_cache: dict[str, str] = {}
        if include_receipt_rendered:
            from systems.inventory.services.borrow_request_service import BorrowService

            receipt_service = BorrowService()

        query_row_limit = (
            self._MAX_RECEIPT_RENDER_ROWS
            if include_receipt_rendered
            else self._MAX_QUERY_ROWS
        )

        def get_cached_receipt_payload(request_id_value: str) -> str:
            if receipt_service is None:
                return ""
            if request_id_value not in receipt_payload_cache:
                receipt_payload_cache[request_id_value] = self._get_receipt_rendered_payload(
                    receipt_service,
                    session,
                    request_id_value,
                )
            return receipt_payload_cache[request_id_value]
        if receipt_service:
            headers.append("Receipt Rendered")

        normalized_serial_number = serial_number.strip() if serial_number else None

        borrower_user = aliased(User)
        approved_user = aliased(User)
        assigned_user = aliased(User)
        assignment_released_user = aliased(User)
        request_released_user = aliased(User)
        received_return_user = aliased(User)

        statement = (
            select(
                BorrowRequestUnit,
                BorrowRequest,
                InventoryUnit,
                InventoryItem,
                borrower_user,
                approved_user,
                assigned_user,
                assignment_released_user,
                request_released_user,
                received_return_user,
            )
            .join(BorrowRequest, BorrowRequestUnit.borrow_uuid == BorrowRequest.id)
            .outerjoin(InventoryUnit, BorrowRequestUnit.unit_uuid == InventoryUnit.id)
            .outerjoin(InventoryItem, InventoryUnit.inventory_uuid == InventoryItem.id)
            .outerjoin(borrower_user, BorrowRequest.borrower_uuid == borrower_user.id)
            .outerjoin(approved_user, BorrowRequest.approved_by == approved_user.id)
            .outerjoin(assigned_user, BorrowRequestUnit.assigned_by == assigned_user.id)
            .outerjoin(
                assignment_released_user,
                BorrowRequestUnit.released_by == assignment_released_user.id,
            )
            .outerjoin(
                request_released_user,
                BorrowRequest.released_by == request_released_user.id,
            )
            .outerjoin(received_return_user, BorrowRequest.received_by == received_return_user.id)
        )
        statement = self._apply_visibility_filters(
            statement,
            BorrowRequestUnit,
            include_deleted,
            include_archived,
        )
        statement = self._apply_visibility_filters(
            statement,
            BorrowRequest,
            include_deleted,
            include_archived,
        )
        statement = self._apply_visibility_filters(
            statement,
            InventoryUnit,
            include_deleted,
            include_archived,
        )
        statement = self._apply_visibility_filters(
            statement,
            InventoryItem,
            include_deleted,
            include_archived,
        )
        statement = self._apply_datetime_window(
            statement,
            BorrowRequest.request_date,
            normalized_from_date,
            normalized_to_date,
        )

        if status and status != "all":
            statement = statement.where(BorrowRequest.status == status)

        if item_id:
            statement = statement.where(InventoryItem.item_id == item_id)

        if borrower_id:
            statement = statement.where(borrower_user.user_id == borrower_id)

        if normalized_serial_number:
            statement = statement.where(InventoryUnit.serial_number == normalized_serial_number)

        results = self._execute_bounded_query(
            session,
            statement,
            query_row_limit,
            "borrow history",
        )

        def _format_actor(user_obj: User | None) -> str:
            if user_obj is None:
                return "N/A"
            return f"{user_obj.first_name} {user_obj.last_name} ({user_obj.employee_id or user_obj.user_id})"

        data = [
            [
                req.request_id,
                _format_actor(borrower) if borrower else (req.customer_name or "N/A"),
                inventory_item.name if inventory_item else "Unknown Item",
                unit.serial_number if unit and unit.serial_number else "",
                _format_actor(approved),
                _format_actor(assigned),
                assignment.condition_on_release
                or (unit.condition if unit and unit.condition else "N/A"),
                _format_actor(assignment_released or request_released),
                self._format_timestamp(assignment.released_at or req.released_at),
                self._format_timestamp(assignment.returned_at or req.returned_at),
                _format_actor(received_return),
                assignment.condition_on_return or "N/A",
                *(
                    [get_cached_receipt_payload(req.request_id)]
                    if receipt_service
                    else []
                ),
            ]
            for (
                assignment,
                req,
                unit,
                inventory_item,
                borrower,
                approved,
                assigned,
                assignment_released,
                request_released,
                received_return,
            ) in results
        ]
        
        return self._create_response(headers, data, format, "borrow_history")

    def export_movements(
        self, 
        session: Session, 
        format: str, 
        movement_type: Optional[str] = None,
        item_id: Optional[str] = None,
        serial_number: Optional[str] = None,
        timeline_mode: TimelineMode | None = None,
        anchor_date: date | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        include_deleted: bool = False,
        include_archived: bool = False,
    ) -> StreamingResponse:
        normalized_from_date, normalized_to_date = self._resolve_time_window(
            timeline_mode=timeline_mode,
            anchor_date=anchor_date,
            date_from=date_from,
            date_to=date_to,
        )

        headers = [
            "Serial Number",
            "Item Name",
            "Who Borrowed",
            "When It was Borrowed",
            "Condition on Release",
            "When It was Returned",
            "Condition on Return",
            "Request ID (As a Reference)",
        ]
        from systems.admin.models.user import User

        normalized_serial_number = serial_number.strip() if serial_number else None
        normalized_movement_type = (movement_type or "all").strip().lower()
        if normalized_movement_type not in {"all", "out", "in"}:
            raise ValueError("movement_type must be one of: all, out, in")

        borrower_user = aliased(User)
        borrowed_timestamp = func.coalesce(
            BorrowRequestUnit.released_at,
            BorrowRequest.released_at,
        )
        borrowed_window_timestamp = func.coalesce(
            BorrowRequestUnit.released_at,
            BorrowRequest.released_at,
            BorrowRequest.request_date,
        )
        returned_timestamp = func.coalesce(
            BorrowRequestUnit.returned_at,
            BorrowRequest.returned_at,
        )

        statement = (
            select(
                BorrowRequestUnit,
                BorrowRequest,
                InventoryUnit,
                InventoryItem,
                borrower_user,
            )
            .join(BorrowRequest, BorrowRequestUnit.borrow_uuid == BorrowRequest.id)
            .outerjoin(InventoryUnit, BorrowRequestUnit.unit_uuid == InventoryUnit.id)
            .outerjoin(InventoryItem, InventoryUnit.inventory_uuid == InventoryItem.id)
            .outerjoin(borrower_user, BorrowRequest.borrower_uuid == borrower_user.id)
        )
        statement = self._apply_visibility_filters(
            statement,
            BorrowRequestUnit,
            include_deleted,
            include_archived,
        )
        statement = self._apply_visibility_filters(
            statement,
            BorrowRequest,
            include_deleted,
            include_archived,
        )
        statement = self._apply_visibility_filters(
            statement,
            InventoryUnit,
            include_deleted,
            include_archived,
        )
        statement = self._apply_visibility_filters(
            statement,
            InventoryItem,
            include_deleted,
            include_archived,
        )

        if normalized_movement_type == "out":
            statement = statement.where(borrowed_timestamp.is_not(None))
            statement = self._apply_datetime_window(
                statement,
                borrowed_timestamp,
                normalized_from_date,
                normalized_to_date,
            )
        elif normalized_movement_type == "in":
            statement = statement.where(returned_timestamp.is_not(None))
            statement = self._apply_datetime_window(
                statement,
                returned_timestamp,
                normalized_from_date,
                normalized_to_date,
            )
        else:
            if normalized_from_date or normalized_to_date:
                borrowed_window_predicates = []
                returned_window_predicates = []

                if normalized_from_date:
                    borrowed_window_predicates.append(
                        borrowed_window_timestamp >= normalized_from_date
                    )
                    returned_window_predicates.append(
                        returned_timestamp >= normalized_from_date
                    )
                if normalized_to_date:
                    borrowed_window_predicates.append(
                        borrowed_window_timestamp <= normalized_to_date
                    )
                    returned_window_predicates.append(
                        returned_timestamp <= normalized_to_date
                    )

                statement = statement.where(
                    or_(
                        and_(*borrowed_window_predicates),
                        and_(*returned_window_predicates),
                    )
                )

        if item_id:
            statement = statement.where(InventoryItem.item_id == item_id)

        if normalized_serial_number:
            statement = statement.where(InventoryUnit.serial_number == normalized_serial_number)

        results = self._execute_bounded_query(
            session,
            statement,
            self._MAX_QUERY_ROWS,
            "equipment history",
        )

        def _format_actor(user_obj: User | None) -> str:
            if user_obj is None:
                return "N/A"
            return f"{user_obj.first_name} {user_obj.last_name} ({user_obj.employee_id or user_obj.user_id})"

        data = [
            [
                unit.serial_number if unit and unit.serial_number else "",
                item.name if item else "Unknown Item",
                _format_actor(borrower) if borrower else (req.customer_name or "N/A"),
                self._format_timestamp(assignment.released_at or req.released_at or req.request_date),
                assignment.condition_on_release
                or (unit.condition if unit and unit.condition else "N/A"),
                self._format_timestamp(assignment.returned_at or req.returned_at),
                assignment.condition_on_return or "N/A",
                req.request_id,
            ]
            for assignment, req, unit, item, borrower in results
        ]
        
        return self._create_response(headers, data, format, "inventory_movements")

    def export_entrusted(
        self,
        session: Session,
        format: str,
        search: Optional[str] = None,
        status: Optional[str] = None,
        category: Optional[str] = None,
        classification: Optional[str] = None,
    ) -> StreamingResponse:
        from systems.inventory.services.entrusted_item_service import EntrustedItemService
        
        service = EntrustedItemService()
        assignments, _ = service.get_all_entrusted(
            session=session,
            skip=0,
            limit=self._MAX_EXPORT_ROWS,
            search=search,
            status=status,
            category=category,
            classification=classification
        )

        headers = [
            "Assignment ID",
            "Item Name",
            "Serial Number",
            "Assigned To Name",
            "Assigned To ID",
            "Assigned At",
            "Returned At",
            "Status",
            "Notes"
        ]

        data = [
            [
                ass.assignment_id,
                ass.item_name or "N/A",
                ass.serial_number or "",
                ass.assigned_to_name or "Unknown User",
                ass.assigned_to_user_id,
                ass.assigned_at,
                ass.returned_at if ass.returned_at else "N/A",
                "Returned" if ass.returned_at else "Assigned",
                ass.notes or ""
            ]
            for ass in assignments
        ]

        return self._create_response(headers, data, format, "entrusted_items")

    def _create_response(self, headers: List[str], data: List[List[Any]], format: str, prefix: str) -> StreamingResponse:
        filename = f"{prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        sanitized_headers = [self._sanitize_export_cell(header) for header in headers]
        sanitized_data = self._sanitize_export_rows(data)
        
        if format == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(sanitized_headers)
            writer.writerows(sanitized_data)
            output.seek(0)
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={filename}.csv"}
            )
        
        elif format == "xlsx":
            wb = Workbook()
            ws = wb.active
            ws.title = prefix.replace("_", " ").title()
            
            # Write headers
            for col, header in enumerate(sanitized_headers, 1):
                cell = ws.cell(row=1, column=col, value=header)
                cell.font = Font(bold=True)
                cell.alignment = Alignment(horizontal="center")
            
            # Write data
            for row_idx, row_data in enumerate(sanitized_data, 2):
                for col_idx, value in enumerate(row_data, 1):
                    ws.cell(row=row_idx, column=col_idx, value=value)
            
            output = io.BytesIO()
            wb.save(output)
            output.seek(0)
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"}
            )
        
        raise ValueError(
            f"Unsupported export format: {format}. Supported formats: csv, xlsx"
        )
