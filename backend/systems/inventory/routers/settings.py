from fastapi import APIRouter, Depends, Request
from sqlmodel import Session
from core.database import get_session
from core.schemas import GenericResponse, create_success_response
from systems.inventory.services.settings_service import InventorySettingsService
from systems.inventory.schemas.settings_schemas import AlertSettingsRead, AlertSettingsUpdate
from utils.mailing import send_email
from systems.auth.dependencies import require_permission, get_current_user
from systems.admin.models.user import User

router = APIRouter()
settings_service = InventorySettingsService()

@router.get("/alerts", response_model=GenericResponse[AlertSettingsRead])
async def get_alert_settings(
    request: Request,
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage"))
):
    """Retrieve aggregate alert settings."""
    settings = settings_service.get_alert_settings(session)
    return create_success_response(data=settings, request=request)

@router.put("/alerts", response_model=GenericResponse[AlertSettingsRead])
async def update_alert_settings(
    settings_data: AlertSettingsUpdate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:config:manage"))
):
    """Update aggregate alert settings."""
    settings = settings_service.update_alert_settings(session, settings_data, actor_id=current_user.id)
    session.commit()

    return create_success_response(data=settings, request=request)

@router.post("/test-email", response_model=GenericResponse[dict])
async def send_test_email(
    request: Request,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:config:manage"))
):
    """Send a test email to the current user to verify SMTP configuration."""
    if not current_user.email:
        return create_success_response(
            data={"success": False, "message": "Current user has no email address configured."},
            request=request
        )

    success = send_email(
        to_email=current_user.email,
        subject="PowerGold - SMTP Test Connection",
        body=(
            f"Hello {current_user.first_name},\n\n"
            "This is a test email from the PowerGold inventory system to verify that your "
            "SMTP configuration is working correctly.\n\n"
            "If you received this, your email alerts are ready to go!"
        )
    )

    return create_success_response(
        data={"success": success, "message": "Test email sent successfully" if success else "Failed to send test email. Check server logs and SMTP configuration."},
        request=request
    )
