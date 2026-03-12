from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from core.schemas import ErrorResponse
from systems.inventory.routers.inventory import router as inventory
from systems.inventory.routers.users import router as users
from systems.inventory.routers.borrowing import router as borrowing
from systems.inventory.routers.auth import router as auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Lendr Unified API", lifespan=lifespan)

# Global Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            status="error",
            message=str(exc.detail),
            error_type="HTTPException",
            path=str(request.url.path),
            method=request.method
        ).model_dump(mode="json")
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            status="error",
            message="Validation error",
            error_type="ValidationError",
            details=exc.errors(),
            path=str(request.url.path),
            method=request.method
        ).model_dump(mode="json")
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            status="error",
            message="Internal server error",
            error_type=exc.__class__.__name__,
            details=str(exc),
            path=str(request.url.path),
            method=request.method
        ).model_dump(mode="json")
    )

app.include_router(inventory, prefix="/api/inventory", tags=["Inventory"])
app.include_router(users, prefix="/api/users", tags=["Users"])
app.include_router(borrowing, prefix="/api/borrowing", tags=["Borrowing"])
app.include_router(auth, prefix="/api/auth", tags=["Auth"])


@app.get("/")
async def root():
    return {"message": "Welcome to the Lendr API"}
