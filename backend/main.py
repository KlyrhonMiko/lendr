from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from core.schemas import GenericResponse, create_error_response

from systems.admin.routers.backup import router as backup

from systems.inventory.routers.auth import router as auth
from systems.inventory.routers.borrowing import router as borrowing
from systems.inventory.routers.requested_items import router as requested_items
from systems.inventory.routers.inventory import router as inventory
from systems.inventory.routers.users import router as users
from systems.inventory.routers.dashboard import router as dashboard
from systems.inventory.routers.audit_log import router as audit_log
from systems.inventory.routers.configuration import router as config

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

app.include_router(backup, prefix="/api/admin/backups", tags=["Admin - Backups"])

app.include_router(auth, prefix="/api/auth", tags=["Auth"])
app.include_router(users, prefix="/api/users", tags=["Users"])
app.include_router(inventory, prefix="/api/inventory", tags=["Inventory"])
app.include_router(borrowing, prefix="/api/borrowing", tags=["Borrowing"])
app.include_router(requested_items, prefix="/api/requested-items", tags=["Requested Items"])
app.include_router(dashboard, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(audit_log, prefix="/api/audit_log", tags=["Audit Logs"])
app.include_router(config, prefix="/api/config", tags=["Configuration"])


@app.get("/")
async def root():
    return {"message": "Welcome to the Lendr API"}
