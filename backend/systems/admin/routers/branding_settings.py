import os
import uuid
import shutil
from typing import Any
from fastapi import APIRouter, Depends, Request, UploadFile, File, HTTPException
from sqlmodel import Session, select

from core.database import get_session
from core.schemas import GenericResponse, create_success_response
from systems.admin.models.settings import AdminConfig
from systems.admin.schemas.branding_settings import (
    BrandingSettingsPayload,
    VisualIdentitySettings,
    BannerSettings,
)
from systems.auth.dependencies import get_current_user, require_permission
from systems.admin.models.user import User
from utils.time_utils import get_now_manila

router = APIRouter()

ASSETS_DIR = "assets/branding"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@router.get(
    "",
    response_model=GenericResponse[BrandingSettingsPayload],
    responses={401: {"model": GenericResponse}},
)
async def get_branding_settings(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    """Fetch branding settings from the database."""
    statement = select(AdminConfig).where(
        AdminConfig.category == "platform_branding",
        AdminConfig.is_deleted.is_(False)
    )
    settings = session.exec(statement).all()
    
    def find_val(key: str, default: Any) -> Any:
        return next((s.value for s in settings if s.key == key), default)

    payload = BrandingSettingsPayload(
        visual_identity=VisualIdentitySettings(
            brand_name=find_val("brand_name", "Lendr"),
            system_theme=find_val("system_theme", "system"),
            logo_url=find_val("logo_url", None),
            favicon_url=find_val("favicon_url", None),
        ),
        banner=BannerSettings(
            is_enabled=str(find_val("banner_enabled", "false")).lower() == "true",
            message=find_val("banner_message", None),
            banner_type=find_val("banner_type", "info"),
            expiry_date=find_val("banner_expiry_date", None),
            expiry_time=find_val("banner_expiry_time", None),
        )
    )
    
    return create_success_response(data=payload, request=request)

@router.put(
    "",
    response_model=GenericResponse[BrandingSettingsPayload],
    responses={401: {"model": GenericResponse}},
)
async def update_branding_settings(
    payload: BrandingSettingsPayload,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    """Update branding configurations."""
    
    def upsert_setting(key: str, value: str, description: str = None):
        statement = select(AdminConfig).where(
            AdminConfig.key == key,
            AdminConfig.category == "platform_branding",
            AdminConfig.is_deleted.is_(False)
        )
        existing = session.exec(statement).first()
        
        if existing:
            existing.value = str(value) if value is not None else ""
            existing.updated_at = get_now_manila()
            if description:
                existing.description = description
            session.add(existing)
        else:
            new_conf = AdminConfig(
                key=key,
                value=str(value) if value is not None else "",
                category="platform_branding",
                system="admin",
                description=description
            )
            session.add(new_conf)

    # Visual Identity
    vi = payload.visual_identity
    upsert_setting("brand_name", vi.brand_name, "Organization display name")
    upsert_setting("system_theme", vi.system_theme, "System-wide color theme")
    upsert_setting("logo_url", vi.logo_url, "Path to organization logo")
    upsert_setting("favicon_url", vi.favicon_url, "Path to system favicon")
    
    # Banner
    bn = payload.banner
    upsert_setting("banner_enabled", str(bn.is_enabled).lower(), "Enable/Disable announcement banner")
    upsert_setting("banner_message", bn.message, "Content of the announcement banner")
    upsert_setting("banner_type", bn.banner_type, "Severity type (info, warning, error)")
    upsert_setting("banner_expiry_date", bn.expiry_date, "Expiration date for the banner")
    upsert_setting("banner_expiry_time", bn.expiry_time, "Expiration time for the banner")
    
    session.commit()
    
    return create_success_response(
        message="Branding configuration updated successfully",
        data=payload,
        request=request
    )

@router.post(
    "/upload",
    response_model=GenericResponse[dict],
    responses={401: {"model": GenericResponse}, 413: {"model": GenericResponse}},
)
async def upload_branding_asset(
    file: UploadFile = File(...),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    """Upload a logo or favicon with 5MB limit."""
    
    # 1. Validate File Size
    # Read a chunk to check size safely if size is not provided by client
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)
    
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (Max 5MB)")

    # 2. Validate File Type
    content_type = file.content_type
    if content_type not in ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PNG, JPG, WEBP, SVG, and ICO are allowed.")

    # 3. Create structure if not exists
    os.makedirs(ASSETS_DIR, exist_ok=True)

    # 4. Generate unique filename to avoid collision and caching issues
    ext = os.path.splitext(file.filename)[1]
    filename = f"branding_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(ASSETS_DIR, filename)

    # 5. Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 6. Return the public URL path
    public_url = f"/api/assets/branding/{filename}"
    
    return create_success_response(
        data={"url": public_url},
        message="Asset uploaded successfully",
        request=request
    )
