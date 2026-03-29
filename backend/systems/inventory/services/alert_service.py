import json
from sqlmodel import Session, select
from systems.inventory.services.configuration_service import InventoryConfigService
from systems.admin.models.user import User

class AlertService:
    def __init__(self):
        self.config_service = InventoryConfigService()

    def evaluate_stock_alerts(self, session: Session, item_id: str):
        """
        Evaluate if an inventory item has crossed thresholds and trigger notifications.
        """
        from systems.inventory.services.inventory_service import InventoryService
        inv_service = InventoryService()
        
        item = inv_service.get(session, item_id)
        if not item or item.total_qty <= 0:
            return

        # Fetch Policy Settings
        configs = self.config_service.get_by_category(session, "inventory_threshold_alerts")
        thresholds = {c.key: c.value for c in configs}
        
        low_stock_pct = int(thresholds.get("low_stock_threshold", "20"))
        overstock_pct = int(thresholds.get("overstock_threshold", "150"))
        
        # Parse Lists (Stored as JSON strings in DB)
        try:
            channels = json.loads(thresholds.get("notification_channels", '["in-app"]'))
            recipient_roles = json.loads(thresholds.get("alert_recipient_roles", '["inventory_manager"]'))
            specific_recipients = json.loads(thresholds.get("specific_recipients", '[]'))
        except (json.JSONDecodeError, TypeError):
            channels = ["in-app"]
            recipient_roles = ["inventory_manager"]
            specific_recipients = []

        current_pct = (item.available_qty / item.total_qty) * 100
        
        alert_type = None
        message = ""

        if current_pct <= low_stock_pct:
            alert_type = "LOW_STOCK"
            message = f"Alert: Item '{item.name}' ({item.item_id}) is at {current_pct:.1f}% capacity ({item.available_qty}/{item.total_qty}). Low stock threshold is {low_stock_pct}%."
        elif current_pct >= overstock_pct:
            alert_type = "OVERSTOCK"
            message = f"Warning: Item '{item.name}' ({item.item_id}) is at {current_pct:.1f}% capacity ({item.available_qty}/{item.total_qty}). Overstock threshold is {overstock_pct}%."

        if alert_type:
            self.trigger_notifications(session, channels, recipient_roles, alert_type, message, specific_recipients)

    def trigger_notifications(self, session: Session, channels: list[str], roles: list[str], alert_type: str, message: str, specific_recipients: list[dict] = None):
        """
        Mock implementation of multi-channel notification triggering.
        """
        # 1. Find system recipients based on roles
        users = session.exec(select(User).where(User.role.in_(roles))).all()
        user_ids = [u.user_id for u in users]
        
        # 2. Add specific recipients
        specific_labels = []
        if specific_recipients:
            for rec in specific_recipients:
                label = f"{rec.get('name')} ({rec.get('email') or rec.get('phone')})"
                specific_labels.append(label)

        # For now, we log to stdout and could eventually write to a 'notifications' table
        print(f"\n[ALERT SYSTEM] Triggered {alert_type}")
        print(f"Message: {message}")
        print(f"Channels: {', '.join(channels)}")
        print(f"System Recipients ({len(user_ids)}): {', '.join(user_ids)}")
        if specific_labels:
            print(f"Specific External Recipients ({len(specific_labels)}): {', '.join(specific_labels)}")
        print("-" * 40)

alert_service = AlertService()
