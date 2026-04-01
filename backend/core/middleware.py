import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from sqlmodel import Session
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from core.database import engine
from core.schemas import create_error_response
from systems.admin.services.configuration_service import ConfigurationService
from systems.admin.services.user_service import UserService
from systems.auth.services.auth_service import auth_service
from utils.security import decode_access_token

logger = logging.getLogger("app")

class MaintenanceMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.config_service = ConfigurationService()
        self.user_service = UserService()
        # Paths that are ALWAYS allowed (to prevent total lockout)
        self.excluded_paths = [
            "/api/auth/login",
            "/api/admin/settings/operations", # Allow admins to turn it off
            "/api/admin/config",
            "/api/health", # Health probes
            "/api/assets"
        ]

    async def dispatch(self, request: Request, call_next):
        # 1. Skip checks for non-API routes, excluded paths, or OPTIONS (CORS preflight)
        path = request.url.path
        if (
            not path.startswith("/api") or 
            request.method == "OPTIONS" or
            any(path.startswith(p) for p in self.excluded_paths)
        ):
            return await call_next(request)

        # 2. Check maintenance mode status
        with Session(engine) as session:
            is_maintenance = self.config_service.get_value(
                session, "maintenance_enabled", "false", category="operations_settings"
            ).lower() == "true"
            
            if not is_maintenance:
                return await call_next(request)

            # 3. Check if user is Admin
            # We try to extract user from token if present
            auth_header = request.headers.get("Authorization")
            is_admin = False
            if auth_header and auth_header.startswith("Bearer "):
                try:
                    token = auth_header.split(" ")[1]
                    # Manually decode token to check role
                    payload = decode_access_token(token)
                    user_id = payload.get("sub")
                    session_id = payload.get("session_id")
                    
                    if user_id and session_id:
                        user = self.user_service.get(session, user_id)
                        # Check if session is valid and user is admin
                        if user and user.role == "admin":
                            is_valid = False
                            if str(session_id).startswith("USE"):
                                is_valid = auth_service.is_user_session_valid(session, session_id)
                                if session.new or session.dirty or session.deleted:
                                    session.commit()
                            
                            if is_valid:
                                is_admin = True
                except Exception:
                    # Token invalid or session revoked
                    pass

            if is_admin:
                return await call_next(request)

            # 4. Block access
            message = self.config_service.get_value(
                session, "maintenance_message", "The system is currently undergoing scheduled maintenance. Please check back later.", category="operations_settings"
            )
            
            return JSONResponse(
                status_code=503,
                content=create_error_response(
                    message=message,
                    error_type="MaintenanceMode",
                    request=request
                ).model_dump(mode="json")
            )
