from sqlmodel import Session
from core.base_service import ConfigBaseService
from systems.inventory.models.settings import InventoryConfig, BorrowerConfig

class InventoryConfigService(ConfigBaseService[InventoryConfig]):
    def __init__(self):
        super().__init__(InventoryConfig)

    def get_weights(self, session: Session, category: str) -> dict[str, int]:
        """Fetch and parse weights from configuration category."""
        configs = self.get_by_category(session, category)
        weights = {}
        for c in configs:
            try:
                weights[c.key.lower()] = int(c.value)
            except (ValueError, TypeError):
                continue
        return weights

class BorrowerConfigService(ConfigBaseService[BorrowerConfig]):
    def __init__(self):
        super().__init__(BorrowerConfig)
