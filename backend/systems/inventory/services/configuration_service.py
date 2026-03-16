from core.base_service import ConfigBaseService
from systems.inventory.models.settings import InventoryConfig, BorrowerConfig

class InventoryConfigService(ConfigBaseService[InventoryConfig]):
    def __init__(self):
        super().__init__(InventoryConfig)

class BorrowerConfigService(ConfigBaseService[BorrowerConfig]):
    def __init__(self):
        super().__init__(BorrowerConfig)
