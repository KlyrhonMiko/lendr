from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from core.schemas import create_error_response

from systems.admin.routers.backup import router as backup
from systems.admin.routers.configuration import router as config
from systems.admin.routers.users import router as users
from systems.admin.routers.roles import router as roles_config
from systems.admin.routers.audit_log import router as admin_audit_log

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Lendr Unified API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/")
async def root():
    return {"message": "Welcome to the Lendr API"}
