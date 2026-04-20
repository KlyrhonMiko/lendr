from typing import List
from datetime import datetime
import logging

from fastapi import APIRouter, Depends, Query, UploadFile, File, Request, HTTPException
from pydantic import ValidationError
from sqlmodel import Session

from core.database import get_session
from core.schemas import GenericResponse, create_success_response, make_pagination_meta
from systems.auth.dependencies import require_permission, get_current_user
from systems.admin.models.user import User
from systems.admin.schemas.user_schemas import UserRead
from systems.inventory.schemas.import_export_schemas import (
    AuditLogExportFilters,
    CatalogExportFilters,
    ImportHistoryRead,
    ImportResponse,
    LedgerMovementsExportFilters,
    LedgerRequestsExportFilters,
    EntrustedExportFilters,
)
from systems.inventory.services.import_service import ImportService
from systems.inventory.services.export_service import ExportService

router = APIRouter()
import_service = ImportService()
export_service = ExportService()
logger = logging.getLogger("app")

EXPORT_VALIDATION_ERROR_DETAIL = "Invalid export request parameters."


def _get_ledger_movements_filters(request: Request) -> LedgerMovementsExportFilters:
    filter_payload = dict(request.query_params)

    # Canonical fields take precedence when both canonical and alias are provided.
    if "date_from" in filter_payload:
        filter_payload.pop("from_date", None)
    if "date_to" in filter_payload:
        filter_payload.pop("to_date", None)

    try:
        return LedgerMovementsExportFilters(**filter_payload)
    except ValidationError as exc:
        logger.exception("Ledger movement export filter validation failed: %s", exc)
        raise HTTPException(status_code=400, detail=EXPORT_VALIDATION_ERROR_DETAIL) from exc

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

    try:
        history = await import_service.process_inventory_import(
            session,
            file,
            mode,
            current_user.id,
        )
    except ValueError as exc:
        detail = str(exc)
        if "maximum allowed size" in detail:
            raise HTTPException(status_code=413, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc
    
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
    filters: AuditLogExportFilters = Depends(),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    effective_date_from = filters.date_from or from_date
    effective_date_to = filters.date_to or to_date
    try:
        return export_service.export_audit_logs(
            session,
            format=filters.format,
            timeline_mode=filters.timeline_mode,
            anchor_date=filters.anchor_date,
            date_from=effective_date_from,
            date_to=effective_date_to,
            include_deleted=filters.include_deleted,
            include_archived=filters.include_archived,
        )
    except ValueError as exc:
        logger.exception("Audit log export validation failed: %s", exc)
        raise HTTPException(status_code=400, detail=EXPORT_VALIDATION_ERROR_DETAIL) from exc

@router.get("/export/ledger/requests")
async def export_borrow_history(
    filters: LedgerRequestsExportFilters = Depends(),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    effective_date_from = filters.date_from or from_date
    effective_date_to = filters.date_to or to_date
    try:
        return export_service.export_borrow_history(
            session,
            format=filters.format,
            status=filters.status,
            item_id=filters.item_id,
            borrower_id=filters.borrower_id,
            serial_number=filters.serial_number,
            include_receipt_rendered=filters.include_receipt_rendered,
            timeline_mode=filters.timeline_mode,
            anchor_date=filters.anchor_date,
            date_from=effective_date_from,
            date_to=effective_date_to,
            include_deleted=filters.include_deleted,
            include_archived=filters.include_archived,
        )
    except ValueError as exc:
        logger.exception("Ledger request export validation failed: %s", exc)
        raise HTTPException(status_code=400, detail=EXPORT_VALIDATION_ERROR_DETAIL) from exc

@router.get("/export/ledger/movements")
async def export_movements(
    filters: LedgerMovementsExportFilters = Depends(_get_ledger_movements_filters),
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    try:
        return export_service.export_movements(
            session,
            format=filters.format,
            movement_type=filters.movement_type,
            item_id=filters.item_id,
            serial_number=filters.serial_number,
            timeline_mode=filters.timeline_mode,
            anchor_date=filters.anchor_date,
            date_from=filters.date_from,
            date_to=filters.date_to,
            include_deleted=filters.include_deleted,
            include_archived=filters.include_archived,
        )
    except ValueError as exc:
        logger.exception("Ledger movement export validation failed: %s", exc)
        raise HTTPException(status_code=400, detail=EXPORT_VALIDATION_ERROR_DETAIL) from exc

@router.get("/export/catalog")
async def export_catalog(
    filters: CatalogExportFilters = Depends(),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    effective_date_from = filters.date_from or from_date
    effective_date_to = filters.date_to or to_date
    try:
        return export_service.export_inventory(
            session,
            format=filters.format,
            timeline_mode=filters.timeline_mode,
            anchor_date=filters.anchor_date,
            date_from=effective_date_from,
            date_to=effective_date_to,
            include_deleted=filters.include_deleted,
            include_archived=filters.include_archived,
        )
    except ValueError as exc:
        logger.exception("Catalog export validation failed: %s", exc)
        raise HTTPException(status_code=400, detail=EXPORT_VALIDATION_ERROR_DETAIL) from exc

@router.get("/export/entrusted")
async def export_entrusted_items(
    filters: EntrustedExportFilters = Depends(),
    session: Session = Depends(get_session),
    _: None = Depends(require_permission("inventory:config:manage")),
):
    try:
        return export_service.export_entrusted(
            session,
            format=filters.format,
            search=filters.search,
            status=filters.status,
            category=filters.category,
            classification=filters.classification,
        )
    except ValueError as exc:
        logger.exception("Entrusted items export validation failed: %s", exc)
        raise HTTPException(status_code=400, detail=EXPORT_VALIDATION_ERROR_DETAIL) from exc

@router.get("/import/template")
async def get_import_template():
    import csv
    import io
    from fastapi.responses import StreamingResponse
    
    output = io.StringIO()
    writer = csv.writer(output)
    headers = ["name", "category", "classification", "item_type", "is_trackable", "description", "condition", "quantity", "serial_number", "expiration_date"]
    writer.writerow(headers)
    writer.writerow(["Thermal Scanner (Fluke)", "items_tools", "equipment", "electronics", "true", "Warehouse scanner", "good", "1", "TS-102938", ""])
    writer.writerow(["Powder Soap", "cmp_pm_acu_pm", "consumable", "cleaning_supplies", "false", "Cleaning consumable", "good", "50", "", "2026-12-01"])
    writer.writerow(["Emergency Light", "declogging", "equipment", "tools", "true", "Portable emergency light", "excellent", "1", "EL-998877", ""])
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventory_import_template.csv"}
    )
