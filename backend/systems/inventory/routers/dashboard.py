from fastapi import APIRouter, Depends, Request
from sqlmodel import Session
from core.database import get_session
from core.deps import get_current_user
from core.schemas import GenericResponse, create_success_response
from systems.admin.models.user import User
from systems.inventory.schemas.borrow_request_schemas import BorrowRequestRead
from systems.inventory.services.dashboard_service import DashboardService, DashboardStats

router = APIRouter()
dashboard_service = DashboardService()

@router.get("/stats", response_model=GenericResponse[DashboardStats])
async def get_dashboard_stats(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    stats = dashboard_service.get_stats(session)
    return create_success_response(data=stats, request=request)

@router.get("/recent", response_model=GenericResponse[list[BorrowRequestRead]])
async def get_recent_activity(
    request: Request,
    limit: int = 5,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    recent = dashboard_service.get_recent_activity(session, limit)
    recent_read = [BorrowRequestRead.model_validate(item) for item in recent]
    return create_success_response(data=recent_read, request=request)
