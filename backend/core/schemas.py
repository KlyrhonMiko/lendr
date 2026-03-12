from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel, Field
from fastapi import Request
from utils.time_utils import get_now_manila, format_datetime

T = TypeVar("T")

class PaginationMeta(BaseModel):
    total: int
    limit: int
    offset: int

class SuccessResponse(BaseModel, Generic[T]):
    status: str = "success"
    message: Optional[str] = None
    data: T
    meta: Optional[PaginationMeta] = None
    timestamp: str = Field(default_factory=lambda: format_datetime(get_now_manila()))
    path: Optional[str] = None
    method: Optional[str] = None

class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
    error_type: str
    details: Optional[Any] = None
    timestamp: str = Field(default_factory=lambda: format_datetime(get_now_manila()))
    path: Optional[str] = None
    method: Optional[str] = None

def create_success_response(data: T, message: Optional[str] = None, meta: Optional[PaginationMeta] = None, request: Optional[Request] = None) -> SuccessResponse[T]:
    return SuccessResponse(
        data=data,
        message=message,
        meta=meta,
        path=str(request.url.path) if request else None,
        method=request.method if request else None
    )
