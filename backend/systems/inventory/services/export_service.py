import io
import csv
from datetime import datetime
from typing import List, Any, Optional
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
from sqlmodel import Session, select
from fastapi.responses import StreamingResponse

from core.models.audit_log import AuditLog
from systems.inventory.models.borrow_request import BorrowRequest
from systems.inventory.models.inventory_movement import InventoryMovement
from systems.inventory.models.inventory import InventoryItem
from systems.inventory.models.inventory_unit import InventoryUnit
from systems.inventory.models.inventory_batch import InventoryBatch

class ExportService:
    def export_audit_logs(
        self, 
        session: Session, 
        format: str, 
        from_date: Optional[datetime] = None, 
        to_date: Optional[datetime] = None
    ) -> StreamingResponse:
        statement = select(AuditLog)
        if from_date:
            statement = statement.where(AuditLog.created_at >= from_date)
        if to_date:
            statement = statement.where(AuditLog.created_at <= to_date)
            
        logs = session.exec(statement).all()
        
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
        format: str
    ) -> StreamingResponse:
        headers = ["name", "category", "classification", "item_type", "is_trackable", "description", "condition", "quantity", "serial_number", "expiration_date"]
        
        # We export a row for each unit (if trackable) or each batch (if not)
        data = []
        items = session.exec(select(InventoryItem)).all()
        for item in items:
            if item.is_trackable:
                units = session.exec(select(InventoryUnit).where(InventoryUnit.inventory_uuid == item.id)).all()
                if not units:
                    data.append([
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
                    data.append([
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
                batches = session.exec(select(InventoryBatch).where(InventoryBatch.inventory_uuid == item.id)).all()
                if not batches:
                    data.append([
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
                    data.append([
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
        borrower_id: Optional[str] = None
    ) -> StreamingResponse:
        from systems.admin.models.user import User
        statement = select(BorrowRequest, User).outerjoin(
            User, BorrowRequest.borrower_uuid == User.id
        )
        
        if status and status != "all":
            statement = statement.where(BorrowRequest.status == status)
        
        if borrower_id:
            statement = statement.where(User.user_id == borrower_id)
            
        results = session.exec(statement).all()
        
        headers = ["Request ID", "Borrower", "Status", "Items Count", "Date Created", "Return Date"]
        data = [
            [
                req.request_id,
                f"{user.first_name} {user.last_name} ({user.employee_id or user.user_id})" if user else (req.customer_name or "N/A"),
                req.status,
                len(req.items) if hasattr(req, 'items') else 0,
                req.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                req.return_at.strftime("%Y-%m-%d %H:%M:%S") if req.return_at else "N/A"
            ]
            for req, user in results
        ]
        
        return self._create_response(headers, data, format, "borrow_history")

    def export_movements(
        self, 
        session: Session, 
        format: str, 
        movement_type: Optional[str] = None,
        item_id: Optional[str] = None
    ) -> StreamingResponse:
        from systems.admin.models.user import User
        # Join with InventoryItem and User
        statement = select(InventoryMovement, InventoryItem, User).outerjoin(
            InventoryItem, InventoryMovement.inventory_uuid == InventoryItem.id
        ).outerjoin(
            User, InventoryMovement.actor_id == User.id
        )
        
        if movement_type and movement_type != "all":
            statement = statement.where(InventoryMovement.movement_type == movement_type)
        
        if item_id:
            statement = statement.where(InventoryItem.item_id == item_id)
            
        results = session.exec(statement).all()
        
        headers = ["Movement ID", "Type", "Item ID", "Item Name", "Quantity", "Actor", "Timestamp", "Reason"]
        data = [
            [
                mov.movement_id,
                mov.movement_type,
                item.item_id if item else "N/A",
                item.name if item else "Unknown Item",
                mov.qty_change,
                f"{user.first_name} {user.last_name} ({user.employee_id or user.user_id})" if user else "System",
                mov.occurred_at.strftime("%Y-%m-%d %H:%M:%S"),
                mov.reason_code or ""
            ]
            for mov, item, user in results
        ]
        
        return self._create_response(headers, data, format, "inventory_movements")

    def _create_response(self, headers: List[str], data: List[List[Any]], format: str, prefix: str) -> StreamingResponse:
        filename = f"{prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        if format == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(headers)
            writer.writerows(data)
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
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=1, column=col, value=header)
                cell.font = Font(bold=True)
                cell.alignment = Alignment(horizontal="center")
            
            # Write data
            for row_idx, row_data in enumerate(data, 2):
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
        
        return None
