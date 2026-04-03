import os
import json
import uuid
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, Request, UploadFile, File, HTTPException
from pydantic import ValidationError

from core.schemas import GenericResponse, create_success_response
from systems.admin.schemas.branding_settings import (
    BrandingSettingsPayload,
    VisualIdentitySettings,
)
from systems.auth.dependencies import get_current_user, require_permission
from systems.admin.models.user import User

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[3]
ASSETS_DIR = BASE_DIR / "assets" / "branding"
BRANDING_JSON_PATH = ASSETS_DIR / "branding.json"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/x-icon",
}


def _default_branding_settings() -> BrandingSettingsPayload:
    return BrandingSettingsPayload(
        visual_identity=VisualIdentitySettings(
            brand_name="Lendr",
            system_theme="system",
            logo_url=None,
            favicon_url=None,
        )
    )


def _load_branding_settings() -> BrandingSettingsPayload:
    if not BRANDING_JSON_PATH.exists():
        return _default_branding_settings()

    try:
        with BRANDING_JSON_PATH.open("r", encoding="utf-8") as file:
            raw_payload = json.load(file)
        return BrandingSettingsPayload.model_validate(raw_payload)
    except (OSError, json.JSONDecodeError, ValidationError):
        return _default_branding_settings()


def _save_branding_settings(payload: BrandingSettingsPayload) -> None:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    payload_dict = payload.model_dump(mode="json")
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=ASSETS_DIR,
        delete=False,
        suffix=".json",
    ) as temp_file:
        json.dump(payload_dict, temp_file, indent=2)
        temp_file.write("\n")
        temp_path = Path(temp_file.name)

    os.replace(temp_path, BRANDING_JSON_PATH)


def _has_valid_file_signature(content_type: str | None, file_head: bytes) -> bool:
    if content_type == "image/png":
        return file_head.startswith(b"\x89PNG\r\n\x1a\n")

    if content_type == "image/jpeg":
        return file_head.startswith(b"\xff\xd8\xff")

    if content_type == "image/webp":
        return len(file_head) >= 12 and file_head[0:4] == b"RIFF" and file_head[8:12] == b"WEBP"

    if content_type == "image/x-icon":
        return file_head.startswith(b"\x00\x00\x01\x00")

    return False

@router.get(
    "",
    response_model=GenericResponse[BrandingSettingsPayload],
)
async def get_branding_settings(
    request: Request,
):
    """Fetch branding settings from file-backed JSON config."""
    payload = _load_branding_settings()

    return create_success_response(data=payload, request=request)

@router.put(
    "",
    response_model=GenericResponse[BrandingSettingsPayload],
    responses={401: {"model": GenericResponse}},
)
async def update_branding_settings(
    payload: BrandingSettingsPayload,
    request: Request,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin:config:manage")),
):
    """Persist branding settings in file-backed JSON config."""
    _save_branding_settings(payload)

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
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PNG, JPEG, WEBP, and ICO are allowed.",
        )

    # 3. Validate File Content Signature to prevent MIME spoofing
    file_head = file.file.read(4096)
    file.file.seek(0)
    if not _has_valid_file_signature(content_type, file_head):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file content does not match the declared file type.",
        )

    # 4. Create structure if not exists
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    # 5. Generate unique filename to avoid collision and caching issues
    ext = os.path.splitext(file.filename)[1]
    filename = f"branding_{uuid.uuid4().hex}{ext}"
    file_path = ASSETS_DIR / filename

    # 6. Save file
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 7. Return the public URL path
    public_url = f"/api/assets/branding/{filename}"
    
    return create_success_response(
        data={"url": public_url},
        message="Asset uploaded successfully",
        request=request
    )
