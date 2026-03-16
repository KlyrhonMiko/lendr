from core.base_service import ConfigBaseService
from systems.auth.models.settings import AuthConfig

class AuthConfigService(ConfigBaseService[AuthConfig]):
    def __init__(self):
        super().__init__(AuthConfig)
