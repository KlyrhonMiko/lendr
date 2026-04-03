from contextlib import asynccontextmanager
import time
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from core.database import engine
from core.config import settings
from core.initialization_service import InitializationService
from core.request_context import reset_correlation_id, set_correlation_id
from core.schemas import create_error_response
from utils.logging import setup_logging, get_logger, setup_health_logging, log_operation

# Routers
from systems.admin.routers.backup import router as backup
from systems.admin.routers.configuration import router as config
from systems.admin.routers.general_settings import router as general_settings
from systems.admin.routers.branding_settings import router as branding_settings
from systems.admin.routers.users import router as users
from systems.admin.routers.roles import router as roles_config
from systems.admin.routers.audit_log import router as admin_audit_log
from systems.admin.routers.dashboard import router as admin_dashboard
from systems.admin.routers.health import router as health
from systems.admin.routers.operations_settings import router as operations_settings
from systems.admin.routers.security_settings import router as security_settings
from systems.admin.routers.archives import router as archives

from systems.auth.dependencies import require_system_access
from core.middleware import MaintenanceMiddleware
from systems.auth.routers.auth import router as auth
from systems.auth.routers.configuration import router as auth_config
from systems.inventory.routers.borrowing import router as borrowing
from systems.inventory.routers.inventory import router as inventory
from systems.inventory.routers.dashboard import router as dashboard
from systems.inventory.routers.audit_log import router as audit_log
from systems.inventory.routers.borrower import router as borrower
from systems.inventory.routers.configuration import router as inv_config
from systems.inventory.routers.settings import router as inv_settings
from systems.inventory.routers.data import router as data

# Initialize System-wide Logging
setup_logging(log_level=settings.LOG_LEVEL, log_dir=settings.LOG_DIR)
setup_health_logging()
logger = get_logger("app")
health_logger = get_logger("health")


def _parse_csv_setting(raw_value: str, fallback: list[str]) -> list[str]:
    values = [value.strip() for value in raw_value.split(",") if value.strip()]
    return values or fallback


def _normalize_cors_origins(raw_value: str) -> list[str]:
    fallback = ["http://localhost:3000", "http://127.0.0.1:3000"]
    configured = _parse_csv_setting(raw_value, fallback)

    normalized: list[str] = []
    for origin in configured:
        if origin == "*":
            normalized.append(origin)
            continue

        if origin.startswith("http://") or origin.startswith("https://"):
            normalized.append(origin.rstrip("/"))
            continue

        logger.warning("Ignoring invalid CORS origin: %s", origin)

    if not normalized:
        logger.warning("No valid CORS origins configured. Falling back to localhost defaults.")
        return fallback

    return normalized


def _is_secure_request(request: Request) -> bool:
    forwarded_proto = request.headers.get("X-Forwarded-Proto", "")
    if forwarded_proto:
        return forwarded_proto.split(",", maxsplit=1)[0].strip().lower() == "https"
    return request.url.scheme == "https"


def _is_docs_request(request: Request) -> bool:
    return request.url.path in {"/docs", "/redoc", "/openapi.json"}


def _docs_content_security_policy() -> str:
    return (
        "default-src 'none'; "
        "base-uri 'none'; "
        "frame-ancestors 'none'; "
        "connect-src 'self'; "
        "img-src 'self' data: https://fastapi.tiangolo.com; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "font-src 'self' https://cdn.jsdelivr.net"
    )


def _resolve_request_correlation_id(request: Request) -> str:
    incoming = request.headers.get("X-Correlation-ID", "").strip()
    if incoming:
        return incoming[:128]
    return f"req-{uuid4().hex}"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # System Initialization
    if not settings.SKIP_INIT:
        with Session(engine) as session:
            init_service = InitializationService()
            init_service.run(session)
            
            # Initialize System Localization
            from systems.admin.services.configuration_service import ConfigurationService
            from utils.time_utils import update_system_timezone, update_system_format
            
            config_service = ConfigurationService()
            tz = config_service.get_value(session, "timezone", "Asia/Manila", category="general_settings")
            df = config_service.get_value(session, "date_format", "MM/DD/YYYY", category="general_settings")
            tf = config_service.get_value(session, "time_format", "12h", category="general_settings")
            
            update_system_timezone(tz)
            update_system_format(df, tf)
            
            # Start Background Scheduler
            from systems.admin.services.scheduler_service import scheduler_service
            scheduler_service.start()
            
        log_operation("INIT-DONE", "System Initialization COMPLETED")
        log_operation("DB-CONNECT", "PostgreSQL connectivity established")
        log_operation("LOCALE-INIT", f"System Timezone set to {tz}, Format: {df} {tf}")
    else:
        logger.warning("System Initialization SKIPPED (SKIP_INIT=True)")
        log_operation("INIT-SKIP", "System Initialization SKIPPED", level="WARNING")
    yield


docs_url = "/docs" if settings.SWAGGER_UI_ENABLED else None
redoc_url = "/redoc" if settings.SWAGGER_UI_ENABLED else None
openapi_url = "/openapi.json" if settings.SWAGGER_UI_ENABLED else None

app = FastAPI(
    title="Lendr Unified API",
    lifespan=lifespan,
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
)

# Mount Static Assets
app.mount("/api/assets", StaticFiles(directory="assets"), name="assets")

# --- Middleware Stack (Last added is Outermost) ---

# 3. Custom Logging Middleware (Innermost of the three)
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Global middleware to log every request and its outcome."""
    correlation_id = _resolve_request_correlation_id(request)
    request.state.correlation_id = correlation_id
    context_token = set_correlation_id(correlation_id)
    start_time = time.time()

    try:
        response = await call_next(request)
        process_time = round((time.time() - start_time) * 1000, 2)

        response.headers.setdefault("X-Correlation-ID", correlation_id)

        # Log basic request info
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code} ({process_time}ms)"
        )
        return response
    except Exception as e:
        process_time = round((time.time() - start_time) * 1000, 2)
        # Detailed error logging for backend failures
        logger.error(
            f"{request.method} {request.url.path} - FAILED ({process_time}ms) - Error: {str(e)}",
            exc_info=True
        )
        raise e
    finally:
        reset_correlation_id(context_token)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)

    if not settings.SECURITY_HEADERS_ENABLED:
        return response

    if _is_docs_request(request):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("X-Permitted-Cross-Domain-Policies", "none")
        response.headers.setdefault("Content-Security-Policy", _docs_content_security_policy())
        return response

    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Permitted-Cross-Domain-Policies", "none")
    response.headers.setdefault("Content-Security-Policy", settings.SECURITY_API_CONTENT_SECURITY_POLICY)

    if _is_secure_request(request):
        response.headers.setdefault(
            "Strict-Transport-Security",
            f"max-age={settings.SECURITY_HSTS_MAX_AGE_SECONDS}; includeSubDomains",
        )

    return response

# 2. Maintenance Mode Middleware
app.add_middleware(MaintenanceMiddleware)

# 1. CORSMiddleware (Outermost)
# We add this last so it wraps all other middlewares, including Maintenance
cors_allow_origins = _normalize_cors_origins(settings.CORS_ALLOW_ORIGINS)
cors_allow_methods = _parse_csv_setting(
    settings.CORS_ALLOW_METHODS,
    ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
cors_allow_headers = _parse_csv_setting(
    settings.CORS_ALLOW_HEADERS,
    ["Authorization", "Content-Type", "X-Device-ID"],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=cors_allow_methods,
    allow_headers=cors_allow_headers,
)

# Global Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(
            message=str(exc.detail),
            error_type="HTTPException",
            request=request
        ).model_dump(mode="json")
    )
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content=create_error_response(
            message="Validation error",
            error_type="ValidationError",
            details=exc.errors(),
            request=request
        ).model_dump(mode="json")
    )
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    log_operation("500-INTERNAL", f"Crash in {request.url.path}: {str(exc)}", level="ERROR")
    debug_mode = settings.DEBUG
    return JSONResponse(
        status_code=500,
        content=create_error_response(
            message="Internal server error",
            error_type=exc.__class__.__name__ if debug_mode else "InternalServerError",
            details=str(exc) if debug_mode else None,
            request=request
        ).model_dump(mode="json")
    )

admin_access = [
    Depends(require_system_access("admin")),
]

app.include_router(backup, prefix="/api/admin/backups", tags=["Admin - Backups"], dependencies=admin_access)
app.include_router(users, prefix="/api/admin/users", tags=["Admin - Users"], dependencies=admin_access)
app.include_router(config, prefix="/api/admin/config", tags=["Admin - Configuration"], dependencies=admin_access)
app.include_router(general_settings, prefix="/api/admin/settings/general", tags=["Admin - General Settings"], dependencies=admin_access)
app.include_router(branding_settings, prefix="/api/admin/settings/branding", tags=["Admin - Branding Settings"])
app.include_router(operations_settings, prefix="/api/admin/settings/operations", tags=["Admin - Operations Settings"], dependencies=admin_access)
app.include_router(security_settings, prefix="/api/admin/settings/security", tags=["Admin - Security Settings"], dependencies=admin_access)
app.include_router(archives, prefix="/api/admin/settings/operations/archives", tags=["Admin - Operations Settings"], dependencies=admin_access)
app.include_router(roles_config, prefix="/api/admin/roles", tags=["Admin - Roles"], dependencies=admin_access)
app.include_router(admin_audit_log, prefix="/api/admin/audit-log", tags=["Admin - Audit Logs"], dependencies=admin_access)
app.include_router(admin_dashboard, prefix="/api/admin/dashboard", tags=["Admin - Dashboard"], dependencies=admin_access)
app.include_router(health, prefix="/api/admin/health", tags=["Admin - System Health"], dependencies=admin_access)
app.include_router(auth, prefix="/api/auth", tags=["Auth"])
app.include_router(auth_config, prefix="/api/auth/config", tags=["Auth - Configuration"], dependencies=admin_access)

inventory_access = [
    Depends(require_system_access("inventory")),
]

app.include_router(
    inventory,
    prefix="/api/inventory/items",
    tags=["Inventory - Items"],
    dependencies=inventory_access,
)
app.include_router(
    borrowing,
    prefix="/api/inventory/borrowing",
    tags=["Inventory - Borrowing"],
    dependencies=inventory_access,
)
app.include_router(
    dashboard,
    prefix="/api/inventory/dashboard",
    tags=["Inventory - Dashboard"],
    dependencies=inventory_access,
)
app.include_router(
    audit_log,
    prefix="/api/inventory/audit-log",
    tags=["Inventory - Audit Logs"],
    dependencies=inventory_access,
)
app.include_router(
    borrower,
    prefix="/api/inventory/borrower",
    tags=["Inventory - Borrower Portal"],
)
app.include_router(
    inv_config,
    prefix="/api/inventory/config",
    tags=["Inventory - Configuration"],
    dependencies=inventory_access,
)
app.include_router(
    inv_settings,
    prefix="/api/inventory/settings",
    tags=["Inventory - Global Settings"],
    dependencies=inventory_access,
)
app.include_router(
    data,
    prefix="/api/inventory/data",
    tags=["Inventory - Data Management"],
    dependencies=inventory_access,
)


@app.get("/")
async def root():
    return {"message": "Welcome to the Lendr API"}
