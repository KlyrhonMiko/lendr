from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, UploadFile, File, Request, HTTPException
from sqlmodel import Session

from core.database import get_session
from core.schemas import GenericResponse, create_success_response, make_pagination_meta
from systems.auth.dependencies import require_permission, get_current_user
from systems.admin.models.user import User
from systems.admin.schemas.user_schemas import UserRead
from systems.inventory.services.import_service import ImportService
from systems.inventory.services.export_service import ExportService
from systems.inventory.schemas.import_export_schemas import ImportHistoryRead, ImportResponse

router = APIRouter()
import_service = ImportService()
export_service = ExportService()

@router.get("/borrowers", response_model=GenericResponse[List[UserRead]])
async def get_borrowers(
    request: Request,
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    from systems.admin.services.user_service import UserService
    user_service = UserService()
    # Filter for users with the 'borrower' role specifically as requested
    users, _ = user_service.get_all(session, role="borrower", is_active=True, limit=1000)
    
    return create_success_response(
        data=users,
        request=request
    )

@router.get("/import/history", response_model=GenericResponse[List[ImportHistoryRead]])
async def get_import_history(
    request: Request,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    skip = (page - 1) * per_page
    results, total = import_service.get_history(session, skip=skip, limit=per_page)
    
    return create_success_response(
        data=results,
        meta=make_pagination_meta(total=total, skip=skip, limit=per_page, page=page, per_page=per_page),
        request=request
    )

@router.post("/import", response_model=GenericResponse[ImportResponse])
async def import_inventory(
    request: Request,
    file: UploadFile = File(...),
    mode: str = Query(..., pattern="^(skip|overwrite)$"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
    history = await import_service.process_inventory_import(
        session, file, mode, current_user.id
    )
    
    data = ImportResponse(
        history_id=history.id,
        status=history.status,
        total=history.total_rows,
        success=history.success_count,
        failed=history.error_count
    )
    
    return create_success_response(data=data, request=request)

@router.get("/export/audit-logs")
async def export_audit_logs(
    format: str = Query(..., pattern="^(csv|xlsx)$"),
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    return export_service.export_audit_logs(session, format, from_date, to_date)

@router.get("/export/ledger/requests")
async def export_borrow_history(
    format: str = Query(..., pattern="^(csv|xlsx)$"),
    status: Optional[str] = None,
    borrower_id: Optional[str] = None,
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    return export_service.export_borrow_history(session, format, status, borrower_id)

@router.get("/export/ledger/movements")
async def export_movements(
    format: str = Query(..., pattern="^(csv|xlsx)$"),
    movement_type: Optional[str] = None,
    item_id: Optional[str] = None,
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    return export_service.export_movements(session, format, movement_type, item_id)

@router.get("/export/catalog")
async def export_catalog(
    format: str = Query(..., pattern="^(csv|xlsx)$"),
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    return export_service.export_inventory(session, format)

@router.get("/import/template")
async def get_import_template():
    import csv
    import io
    from fastapi.responses import StreamingResponse
    
    output = io.StringIO()
    writer = csv.writer(output)
    headers = ["name", "category", "classification", "item_type", "is_trackable", "description", "condition", "quantity", "serial_number", "expiration_date"]
    writer.writerow(headers)
    writer.writerow(["MacBook Pro M2", "it_communications", "equipment", "electronics", "true", "High-end laptop", "good", "1", "SN12345M2", "2026-12-31"])
    writer.writerow(["KN95 Masks", "medical_clinical", "consumable", "disposables", "false", "Box of 50", "good", "50", "", "2025-06-01"])
    writer.writerow(["Fire Extinguisher", "safety_security", "equipment", "tools", "true", "ABC Dry Powder 5kg", "excellent", "1", "FE-998877", "2028-01-01"])
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventory_import_template.csv"}
    )
