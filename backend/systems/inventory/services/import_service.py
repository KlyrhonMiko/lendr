import csv
import io
from typing import Optional
from uuid import UUID
from sqlmodel import Session, select, func
from fastapi import UploadFile
from datetime import datetime

from core.config import settings
from systems.inventory.models.inventory import InventoryItem
from systems.inventory.models.import_history import ImportHistory
from systems.inventory.services.inventory_service import InventoryService
from systems.inventory.schemas.inventory_schemas import InventoryItemCreate
from systems.inventory.schemas.inventory_batch_schemas import InventoryBatchCreate

class ImportService:
    def __init__(self):
        self.inventory_service = InventoryService()

    def _parse_bool(self, value: any) -> bool:
        """Robustly parse boolean from CSV strings."""
        if value is None:
            return False
        if isinstance(value, bool):
            return value
        s = str(value).lower().strip()
        return s in ("true", "1", "yes", "y", "t", "on")

    def get_history(self, session: Session, skip: int = 0, limit: int = 100) -> tuple[list[ImportHistory], int]:
        """Get paginated import history."""
        statement = select(ImportHistory).order_by(ImportHistory.created_at.desc())
        
        # Count total
        count_stmt = select(func.count()).select_from(statement.subquery())
        total = session.exec(count_stmt).one()
        
        # Get results
        results = session.exec(statement.offset(skip).limit(limit)).all()
        
        return list(results), total

    async def process_inventory_import(
        self, 
        session: Session, 
        file: UploadFile, 
        mode: str, 
        actor_id: Optional[UUID] = None
    ) -> ImportHistory:
        content = await file.read()
        max_size = max(settings.IMPORT_MAX_CSV_SIZE_BYTES, 1)
        if len(content) > max_size:
            raise ValueError(
                f"CSV file exceeds maximum allowed size of {max_size} bytes"
            )

        decoded = content.decode("utf-8")
        # Pre-process the string IO to strip spaces from headers
        input_stream = io.StringIO(decoded)
        first_line = input_stream.readline()
        if first_line:
            headers = [h.strip() for h in next(csv.reader(io.StringIO(first_line)))]
            input_stream = io.StringIO(decoded) # Reset
            reader = csv.DictReader(input_stream, fieldnames=headers)
            next(reader) # Skip header row
        else:
            reader = csv.DictReader(input_stream)
        
        # 0. Initial record of the import (Committed immediately)
        history = ImportHistory(
            filename=file.filename or "unknown.csv",
            status="processing",
            total_rows=0,
            success_count=0,
            error_count=0,
            error_log=[],
            actor_id=actor_id
        )
        session.add(history)
        session.commit()
        session.refresh(history)

        errors = []
        rows_count = 0
        success_count = 0
        error_count = 0
        
        # 1. Start Transactional Wrapper
        original_commit = session.commit
        session.commit = session.flush # Atomic mapping: commit -> flush

        try:
            for i, row in enumerate(reader, 1):
                rows_count += 1
                try:
                    # 0. Strip all whitespace from values
                    row = {k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()}
                    
                    # 0. Smart Rescue/Mapping (in case user swapped columns)
                    self._rescue_mapping(session, row)

                    # 1. Validation & Parsing
                    name = row.get("name") or ""
                    classification = row.get("classification") or ""
                    
                    is_trackable = self._parse_bool(row.get("is_trackable", "false"))
                    
                    if not name:
                        raise ValueError("Missing mandatory item field: name")

                    # Upsert Item
                    item = self._get_or_create_item(session, row, mode, actor_id)
                    
                    qty_value = str(row.get("quantity") or "").strip()
                    serial_value = str(row.get("serial_number") or "").strip()

                    # 2. Targeted Logic based on supplied stock data
                    if qty_value in {"", "0"} and not serial_value:
                        # Item-only import: keep the record in inventory without creating units/batches.
                        pass
                    elif is_trackable:
                        self._handle_unit_import(session, item, row, mode, actor_id)
                    else:
                        self._handle_batch_import(session, item, row, actor_id)

                    success_count += 1
                except Exception as e:
                    error_count += 1
                    errors.append({"row": i, "error": str(e), "data": row})

            # Restore original commit method
            session.commit = original_commit

            # 2. Final Atomic Decision
            if error_count > 0:
                # If even one row failed, roll back ALL inventory changes
                session.rollback()
                history.status = "failed"
                # Preserve the counts/logs even after rollback
                history.total_rows = rows_count
                history.success_count = 0 # Mark everything as failed in summary
                history.error_count = error_count
                history.error_log = errors
            else:
                # 100% Success - finalize the transaction
                history.total_rows = rows_count
                history.success_count = success_count
                history.error_count = 0
                history.status = "completed"
                history.error_log = []
                session.commit()

        except Exception as e:
            # Catastrophic failure (e.g. DB connection lost)
            session.commit = original_commit
            session.rollback()
            history.status = "failed"
            history.total_rows = rows_count
            history.error_count = error_count + 1
            errors.append({"row": "system", "error": f"Internal Error: {str(e)}"})
            history.error_log = errors
            
        session.add(history)
        session.commit()
        session.refresh(history)
        
        return history

    def _get_or_create_item(self, session: Session, row: dict, mode: str, actor_id: Optional[UUID]) -> InventoryItem:
        name = row.get("name")
        classification = row.get("classification")
        item_type = row.get("item_type")
        
        # 0. Fetch canonical keys from config to keep DB clean
        def get_canonical(val, category):
            if not val:
                return val
            setting = self.inventory_service.config_service.get_by_key(session, val, category=category)
            return setting.key if setting else val

        canonical_item_type = get_canonical(item_type, "inventory_item_type") or None
        canonical_classification = get_canonical(classification, "inventory_classification") or None
        canonical_category = get_canonical(row.get("category", ""), "inventory_category") or None

        # Check if exists (following ix_inventory_item_name_active)
        statement = select(InventoryItem).where(
            InventoryItem.name == name,
            InventoryItem.classification == canonical_classification,
            InventoryItem.item_type == canonical_item_type,
            InventoryItem.is_deleted.is_(False)
        )
        item = session.exec(statement).first()
        
        if not item:
            # Create base item
            create_data = InventoryItemCreate(
                name=(name or "").strip(),
                category=canonical_category,
                item_type=canonical_item_type,
                classification=canonical_classification,
                is_trackable=self._parse_bool(row.get("is_trackable", "false")),
            )
            item = self.inventory_service.create(session, create_data, prefix="ITEM", actor_id=actor_id)
        elif mode == "overwrite":
            # Update mutable metadata in overwrite mode, keeping canonical config keys
            item.category = canonical_category or item.category
            session.add(item)
            # (Note: item_type and is_trackable are usually immutable for items with stock, 
            # so we avoid changing them during simple import for safety)
        
        return item

    def _handle_unit_import(self, session: Session, item: InventoryItem, row: dict, mode: str, actor_id: Optional[UUID]):
        serial = row.get("serial_number")
        if not serial:
            raise ValueError("serial_number is required for trackable items")
            
        # Check if serial exists
        from systems.inventory.models.inventory_unit import InventoryUnit
        existing_unit = session.exec(select(InventoryUnit).where(InventoryUnit.serial_number == serial)).first()
        
        expiry = None
        if row.get("expiration_date"):
            try:
                expiry = datetime.fromisoformat(row["expiration_date"])
            except Exception:
                raise ValueError(f"Invalid expiration_date format for serial {serial}. Use YYYY-MM-DD")

        if existing_unit:
            if mode == "skip":
                # Already exists, we skip the row processing
                return
            
            # mode == overwrite
            existing_unit.condition = row.get("condition") or existing_unit.condition
            existing_unit.description = row.get("description") or existing_unit.description
            existing_unit.expiration_date = expiry or existing_unit.expiration_date
            session.add(existing_unit)
            return

        self.inventory_service.create_unit(
            session=session,
            item_id=item.item_id,
            serial_number=serial,
            expiration_date=expiry,
            condition=row.get("condition", "good"),
            description=row.get("description"),
            actor_id=actor_id
        )

    def _handle_batch_import(self, session: Session, item: InventoryItem, row: dict, actor_id: Optional[UUID]):
        qty_str = row.get("quantity")
        expiry_str = str(row.get("expiration_date") or "").strip()
        
        if not qty_str:
            raise ValueError("quantity is required for non-trackable items")
            
        try:
            qty = int(qty_str)
            if qty <= 0:
                raise ValueError("quantity must be greater than 0")
        except ValueError:
            raise ValueError(f"Invalid quantity: {qty_str}")
            
        expiry = None
        if expiry_str:
            try:
                expiry = datetime.fromisoformat(expiry_str)
            except Exception:
                # Try simple date format YYYY-MM-DD
                try:
                    expiry = datetime.strptime(expiry_str, "%Y-%m-%d")
                except Exception:
                    raise ValueError(f"Invalid expiration_date format: {expiry_str}. Use YYYY-MM-DD")

        # Create batch
        batch_schema = InventoryBatchCreate(
            expiration_date=expiry,
            description=f"Imported via CSV: {row.get('description', '')}"
        )
        batch = self.inventory_service.create_batch(session, item.item_id, batch_schema, actor_id=actor_id)
        
        # Adjust stock to set initial quantity
        self.inventory_service.adjust_stock(
            session=session,
            item_id=item.item_id,
            qty_change=qty,
            movement_type="procurement",
            reason_code="procurement_correction",
            note="Initial stock set via CSV import",
            batch_id=batch.batch_id,
            actor_id=actor_id
        )

    def _rescue_mapping(self, session: Session, row: dict):
        """
        Heuristic to fix common user mapping errors in CSV imports.
        e.g. Swapping item_type (Electronics) with classification (Equipment) or category (IT).
        """
        # Read current values
        cat = (row.get("category") or "").strip()
        cls = (row.get("classification") or "").strip()
        typ = (row.get("item_type") or "").strip()

        # Categories mapping
        # key=field_name, val=config_category
        mapping = {
            "item_type": "inventory_item_type",
            "classification": "inventory_classification",
            "category": "inventory_category"
        }

        # Try to find which field actually contains which config
        # We only do this if the current mapping is invalid
        def is_valid(val, category):
            if not val:
                return True # Empty is 'technically' valid (null)
            return self.inventory_service.config_service.exists(session, val, category)

        # If all valid, return
        if is_valid(cat, mapping["category"]) and is_valid(cls, mapping["classification"]) and is_valid(typ, mapping["item_type"]):
            return

        # Try to re-assign
        all_vals = [cat, cls, typ]
        results = {}
        for field, category in mapping.items():
            results[field] = None
            for val in all_vals:
                if val and self.inventory_service.config_service.exists(session, val, category):
                    results[field] = val
                    break
        
        # If we found matches for all (or most), update the row
        if results.get("item_type"): 
            row["item_type"] = results["item_type"]
        if results.get("classification"): 
            row["classification"] = results["classification"]
        if results.get("category"): 
            row["category"] = results["category"]
