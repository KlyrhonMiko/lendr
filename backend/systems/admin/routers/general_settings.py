from fastapi import APIRouter, Depends, Request
from sqlmodel import Session, select
from core.database import get_session
from core.deps import get_current_user
from systems.auth.dependencies import require_permission
from core.schemas import GenericResponse, create_success_response
from systems.admin.models.user import User
from systems.admin.schemas.general_settings import (
    GeneralSettingsPayload, 
    LocalizationSettings
)
from systems.admin.models.settings import AdminConfig as Configuration
from systems.admin.services.configuration_service import ConfigurationService
from utils.time_utils import update_system_timezone, update_system_format, get_now_manila

router = APIRouter()
config_service = ConfigurationService()

@router.get("/", response_model=GenericResponse[GeneralSettingsPayload])
async def get_general_settings(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    """Fetch current system-wide localization settings."""
    # Find all belonging to 'general_settings' category
    statement = select(Configuration).where(Configuration.category == "general_settings")
    settings = session.exec(statement).all()
    
    def find_val(key: str, default: str) -> str:
        s = next((x for x in settings if x.key == key), None)
        return s.value if s else default

    localization = LocalizationSettings(
        timezone=find_val("timezone", "Asia/Manila"),
        date_format=find_val("date_format", "MM/DD/YYYY"),
        time_format=find_val("time_format", "12h"),
        language=find_val("language", "en")
    )

    payload = GeneralSettingsPayload(
        localization=localization
    )

    return create_success_response(
        data=payload,
        message="General settings retrieved successfully",
        request=request
    )

@router.put("/", response_model=GenericResponse[GeneralSettingsPayload])
async def update_general_settings(
    payload: GeneralSettingsPayload,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    """Update system-wide general settings."""
    
    def upsert_setting(key: str, value: str, description: str):
        # We target specific keys within the general_settings category
        existing = session.exec(
            select(Configuration).where(
                Configuration.key == key, 
                Configuration.category == "general_settings"
            )
        ).first()

        if existing:
            existing.value = value
            existing.updated_at = get_now_manila()
            session.add(existing)
        else:
            new_config = Configuration(
                system="admin",
                key=key,
                value=value,
                category="general_settings",
                description=description,
                created_at=get_now_manila(),
                updated_at=get_now_manila()
            )
            session.add(new_config)

    # 1. Store Localization
    loc = payload.localization
    upsert_setting("timezone", loc.timezone, "System default timezone")
    upsert_setting("date_format", loc.date_format, "System-wide date display format")
    upsert_setting("time_format", loc.time_format, "12h or 24h time display")
    upsert_setting("language", loc.language, "System default language")

    session.commit()
    
    # 2. Update memory state for immediate translation effect
    update_system_timezone(payload.localization.timezone)
    update_system_format(payload.localization.date_format, payload.localization.time_format)
    
    print(f"[API] General Settings UPDATED - TZ: {payload.localization.timezone}, Format: {payload.localization.date_format} {payload.localization.time_format}")

    return create_success_response(
        message="General configuration synchronized successfully",
        data=payload,
        request=request
    )
