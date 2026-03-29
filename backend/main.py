from contextlib import asynccontextmanager
import time
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from core.database import engine
from core.config import settings
from core.initialization_service import InitializationService
from core.schemas import create_error_response
from utils.logging import setup_logging, get_logger, setup_health_logging, log_operation

# Routers
from systems.admin.routers.backup import router as backup
from systems.admin.routers.configuration import router as config
from systems.admin.routers.users import router as users
from systems.admin.routers.roles import router as roles_config
from systems.admin.routers.audit_log import router as admin_audit_log
from systems.admin.routers.dashboard import router as admin_dashboard
from systems.admin.routers.health import router as health

from systems.auth.dependencies import require_system_access
from systems.auth.routers.auth import router as auth
from systems.auth.routers.configuration import router as auth_config
from systems.inventory.routers.borrowing import router as borrowing
from systems.inventory.routers.requested_items import router as requested_items
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # System Initialization
    if not settings.SKIP_INIT:
        with Session(engine) as session:
            init_service = InitializationService()
            init_service.run(session)
        log_operation("INIT-DONE", "System Initialization COMPLETED")
        log_operation("DB-CONNECT", "PostgreSQL connectivity established")
    else:
        logger.warning("System Initialization SKIPPED (SKIP_INIT=True)")
        log_operation("INIT-SKIP", "System Initialization SKIPPED", level="WARNING")
    yield


app = FastAPI(title="Lendr Unified API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Global middleware to log every request and its outcome."""
    start_time = time.time()
    
    try:
        response = await call_next(request)
        process_time = round((time.time() - start_time) * 1000, 2)
        
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
    return JSONResponse(
        status_code=500,
        content=create_error_response(
            message="Internal server error",
            error_type=exc.__class__.__name__,
            details=str(exc),
            request=request
        ).model_dump(mode="json")
    )

admin_access = [
    Depends(require_system_access("admin")),
]

app.include_router(backup, prefix="/api/admin/backups", tags=["Admin - Backups"], dependencies=admin_access)
app.include_router(users, prefix="/api/admin/users", tags=["Admin - Users"], dependencies=admin_access)
app.include_router(config, prefix="/api/admin/config", tags=["Admin - Configuration"], dependencies=admin_access)
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
)
app.include_router(
    borrowing,
    prefix="/api/inventory/borrowing",
    tags=["Inventory - Borrowing"],
    dependencies=inventory_access,
)
app.include_router(
    requested_items,
    prefix="/api/inventory/requested-items",
    tags=["Inventory - Requested Items"],
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
    dependencies=inventory_access,
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
