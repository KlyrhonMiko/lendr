from typing import Any, Generic, Optional, TypeVar

from fastapi import Request
from pydantic import BaseModel, Field

from utils.time_utils import format_datetime, get_now_manila

T = TypeVar("T")

class PaginationMeta(BaseModel):
    total: int
    limit: int
    offset: int

class GenericResponse(BaseModel, Generic[T]):
    # Common Fields
    status: str # "success" or "error"
    message: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: format_datetime(get_now_manila()))
    path: Optional[str] = None
    method: Optional[str] = None
    
    # Success Specific
    data: Optional[T] = None
    meta: Optional[PaginationMeta] = None
    
    # Error Specific
    error_type: Optional[str] = None
    details: Optional[Any] = None

def create_success_response(
    data: T, 
    message: Optional[str] = None, 
    meta: Optional[PaginationMeta] = None, 
    request: Optional[Request] = None
) -> GenericResponse[T]:
    return GenericResponse(
        status="success",
        data=data,
        message=message,
        meta=meta,
        path=str(request.url.path) if request else None,
        method=request.method if request else None
    )

def create_error_response(
    message: str, 
    error_type: str, 
    details: Optional[Any] = None, 
    request: Optional[Request] = None
) -> GenericResponse[Any]:
    return GenericResponse(
        status="error",
        message=message,
        error_type=error_type,
        details=details,
        path=str(request.url.path) if request else None,
        method=request.method if request else None
    )

# Generic Configuration Schemas
class ConfigBase(BaseModel):
    value: str = Field(..., max_length=255)


class ConfigCreate(ConfigBase):
    key: str = Field(..., max_length=100)
    category: str = Field(default="general", max_length=50)
    description: Optional[str] = None


class ConfigUpdate(ConfigBase):
    description: Optional[str] = None


class ConfigRead(ConfigBase):
    key: str
    category: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
