import csv
import io
from typing import Optional
from uuid import UUID
from sqlmodel import Session, select, func
from fastapi import UploadFile
from datetime import datetime

from systems.inventory.models.inventory import InventoryItem
from systems.inventory.models.import_history import ImportHistory
from systems.inventory.services.inventory_service import InventoryService
from systems.inventory.schemas.inventory_schemas import InventoryItemCreate
from systems.inventory.schemas.inventory_batch_schemas import InventoryBatchCreate

class ImportService:
    def __init__(self):
        self.inventory_service = InventoryService()

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
        decoded = content.decode("utf-8")
        reader = csv.DictReader(io.StringIO(decoded))
        
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
        
        # 1. Start Transactional Wrapper
        # We temporarily replace session.commit with session.flush so sub-services 
        # (like BaseService) don't finalize transactions prematurely.
        original_commit = session.commit
        session.commit = session.flush # Atomic mapping: commit -> flush

        try:
            for i, row in enumerate(reader, 1):
                history.total_rows += 1
                try:
                    # 0. Smart Rescue/Mapping (in case user swapped columns)
                    self._rescue_mapping(session, row)

                    # 1. Validation & Parsing
                    name = (row.get("name") or "").strip()
                    item_type = (row.get("item_type") or "").strip()
                    classification = (row.get("classification") or "").strip()
                    is_trackable_str = (row.get("is_trackable") or "false").lower().strip()
                    is_trackable = is_trackable_str == "true"
                    
                    if not name or not item_type or not classification:
                        raise ValueError(f"Missing mandatory item fields: name='{name}', item_type='{item_type}', or classification='{classification}'")

                    # Upsert Item
                    item = self._get_or_create_item(session, row, mode, actor_id)
                    
                    # 2. Targeted Logic based on Trackability
                    if is_trackable:
                        self._handle_unit_import(session, item, row, mode, actor_id)
                    else:
                        self._handle_batch_import(session, item, row, actor_id)

                    history.success_count += 1
                except Exception as e:
                    history.error_count += 1
                    errors.append({"row": i, "error": str(e), "data": row})

            # Restore original commit method
            session.commit = original_commit

            # 2. Final Atomic Decision
            if history.error_count > 0:
                # If even one row failed, roll back ALL inventory changes
                session.rollback()
                history.status = "failed"
                history.success_count = 0 # Mark everything as failed in summary
            else:
                # 100% Success - finalize the transaction
                session.commit()
                history.status = "completed"

        except Exception as e:
            # Catastrophic failure (e.g. DB connection lost)
            session.commit = original_commit
            session.rollback()
            history.status = "failed"
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

        canonical_item_type = get_canonical(item_type, "inventory_item_type")
        canonical_classification = get_canonical(classification, "inventory_classification")
        canonical_category = get_canonical(row.get("category", ""), "inventory_category")

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
                is_trackable=(row.get("is_trackable") or "false").lower().strip() == "true",
                description=(row.get("description") or "").strip() or None,
                condition=(row.get("condition") or "good").strip().lower()
            )
            item = self.inventory_service.create(session, create_data, prefix="ITEM", actor_id=actor_id)
        elif mode == "overwrite":
            # Update item metadata if overwrite mode is on
            item.category = (row.get("category") or item.category)
            item.description = (row.get("description") or item.description)
            item.condition = (row.get("condition") or "good").lower().strip()
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
        expiry_str = row.get("expiration_date", "").strip()
        
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
