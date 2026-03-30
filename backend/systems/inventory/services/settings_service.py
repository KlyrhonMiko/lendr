import json
from sqlmodel import Session
from systems.inventory.services.configuration_service import InventoryConfigService
from systems.inventory.schemas.settings_schemas import AlertSettingsRead, AlertSettingsUpdate, AlertSettingsBase
from typing import Any

class InventorySettingsService:
    def __init__(self):
        self.config_service = InventoryConfigService()
        self.category = "inventory_threshold_alerts"

    def get_alert_settings(self, session: Session) -> AlertSettingsRead:
        """Fetch and aggregate separate config keys into a structured settings object."""
        # Get keys from the schema itself to stay in sync
        schema_fields = AlertSettingsBase.model_fields.keys()
        
        settings_dict = {}
        for key in schema_fields:
            config = self.config_service.get_by_key(session, key, category=self.category)
            if config:
                # Try to parse JSON for lists/objects, otherwise use value directly
                try:
                    # If it looks like JSON (starts with [ or {), try parsing
                    if config.value and config.value.strip().startswith(('[', '{')):
                        settings_dict[key] = json.loads(config.value)
                    else:
                        settings_dict[key] = config.value
                except (json.JSONDecodeError, TypeError):
                    settings_dict[key] = config.value
        
        # Merge with defaults from the base model
        return AlertSettingsRead(**settings_dict)

    def update_alert_settings(self, session: Session, settings: AlertSettingsUpdate, actor_id: Any = None) -> AlertSettingsRead:
        """Split a structured settings object into individual config keys for storage."""
        data = settings.model_dump()
        
        for key, value in data.items():
            # Serialize lists and dicts to JSON strings for the generic value column
            if isinstance(value, (list, dict)):
                val_to_save = json.dumps(value)
            else:
                val_to_save = str(value)
            
            self.config_service.set_value(
                session,
                key=key,
                value=val_to_save,
                category=self.category,
                description=f"Generated from structured alert settings: {key}",
                actor_id=actor_id
            )
            
        return self.get_alert_settings(session)
