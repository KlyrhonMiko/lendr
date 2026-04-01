import sys
import os
from sqlmodel import Session, select

# Add current directory to path to import backend modules
sys.path.append(os.path.abspath(os.path.curdir))

from core.database import engine
from systems.inventory.services.inventory_service import InventoryService
from systems.inventory.models.inventory import InventoryItem

def verify_alerts():
    service = InventoryService()
    
    with Session(engine) as session:
        # 1. Find an untrackable item
        item = session.exec(select(InventoryItem).where(~InventoryItem.is_trackable, ~InventoryItem.is_deleted)).first()
        if not item:
            print("No untrackable items found to test.")
            return
            
        print(f"Testing alerts for Untrackable Item: {item.name} ({item.item_id})")
        
        # 2. Create a batch for this item to hold quantities
        from systems.inventory.schemas.inventory_batch_schemas import InventoryBatchCreate
        batch = service.create_batch(
            session=session,
            item_id=item.item_id,
            schema=InventoryBatchCreate(description="Alert system testing batch"),
            actor_id=None
        )
        session.commit()
        session.refresh(batch)
        print(f"Created Test Batch: {batch.batch_id}")

        # 3. Force initial healthy state (100 units)
        service.adjust_stock(
            session=session,
            item_id=item.item_id,
            qty_change=100,
            movement_type="procurement",
            reason_code=None,
            note="Initial stock for test",
            batch_id=batch.batch_id
        )
        session.commit()
        session.refresh(item)
        
        print(f"\nPhase 1: Initial Healthy State: {item.available_qty}/{item.total_qty}")
        print(f"Current Status: {service.get_item_status(session, item)}")
        
        # 4. Trigger Low Stock (Drop to 15 units = 15%)
        print("\nPhase 2: Dropping stock to 15 units (15%)...")
        service.adjust_stock(
            session=session,
            item_id=item.item_id,
            qty_change=-85,
            movement_type="manual_adjustment",
            reason_code="count_correction",
            note="Triggering low stock alert",
            batch_id=batch.batch_id
        )
        session.commit()
        session.refresh(item)
        
        print(f"Final State: {item.available_qty}/{item.total_qty}")
        print(f"Final Status: {service.get_item_status(session, item)}")
        
        # 5. Trigger Overstock (Increase to 160 units = 160% of original total)
        print("\nPhase 3: Testing Overstock (161 available / 100 total)...")
        item.available_qty = 161
        item.total_qty = 100 
        item.status = "healthy" # Reset status to allow percentage check to win
        session.add(item)
        session.commit()
        session.refresh(item)
        
        # Manually trigger alert evaluation since we did a manual direct DB update
        from systems.inventory.services.alert_service import alert_service
        alert_service.evaluate_stock_alerts(session, item.item_id)
        
        print(f"Final State: {item.available_qty}/{item.total_qty}")
        print(f"Final Status: {service.get_item_status(session, item)}")

if __name__ == "__main__":
    verify_alerts()
