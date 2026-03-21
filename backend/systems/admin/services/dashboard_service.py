from sqlmodel import Session, select, func, desc
from systems.admin.models.user import User
from core.models.audit_log import AuditLog
from systems.admin.models.backup import BackupRun
from systems.auth.models.user_session import UserSession
from systems.inventory.models.inventory import InventoryItem
from systems.inventory.models.inventory_unit import InventoryUnit
from systems.inventory.models.borrow_request import BorrowRequest
from systems.inventory.models.inventory_movement import InventoryMovement
from pydantic import BaseModel
from datetime import timedelta
from utils.time_utils import get_now_manila, format_datetime
from typing import Optional

class AdminStats(BaseModel):
    total_users: int
    active_sessions: int
    audit_log_count_24h: int
    last_backup_time: Optional[str] = None
    last_backup_status: Optional[str] = None

class ActivityPoint(BaseModel):
    hour: int
    count: int

class RoleDistribution(BaseModel):
    role: str
    count: int

class UserTrend(BaseModel):
    date: str
    count: int

class SystemRegistry(BaseModel):
    entity: str
    count: int

class UserInsights(BaseModel):
    distribution: list[RoleDistribution]
    trends: list[UserTrend]

class AdminDashboardService:
    def get_stats(self, session: Session) -> AdminStats:
        now = get_now_manila()
        twenty_four_hours_ago = now - timedelta(hours=24)

        total_users = session.exec(select(func.count(User.id)).where(User.is_deleted.is_(False))).one()
        
        active_sessions = session.exec(
            select(func.count(UserSession.id))
            .where(UserSession.expires_at > now)
            .where(UserSession.is_revoked.is_(False))
        ).one()

        audit_log_count_24h = session.exec(
            select(func.count(AuditLog.id))
            .where(AuditLog.created_at >= twenty_four_hours_ago)
        ).one()

        last_backup = session.exec(
            select(BackupRun)
            .order_by(desc(BackupRun.started_at))
            .limit(1)
        ).first()

        return AdminStats(
            total_users=total_users,
            active_sessions=active_sessions,
            audit_log_count_24h=audit_log_count_24h,
            last_backup_time=format_datetime(last_backup.started_at) if last_backup else None,
            last_backup_status=last_backup.status if last_backup else None,
        )

    def get_activity_heatmap(self, session: Session) -> list[ActivityPoint]:
        now = get_now_manila()
        twenty_four_hours_ago = now - timedelta(hours=24)

        # Postgres hour extract
        hour_label = func.extract('hour', AuditLog.created_at).label('hour')
        
        rows = session.exec(
            select(hour_label, func.count(AuditLog.id))
            .where(AuditLog.created_at >= twenty_four_hours_ago)
            .group_by(hour_label)
            .order_by(hour_label)
        ).all()

        return [ActivityPoint(hour=int(row[0]), count=int(row[1])) for row in rows]

    def get_user_distribution(self, session: Session) -> list[RoleDistribution]:
        rows = session.exec(
            select(User.role, func.count(User.id))
            .where(User.is_deleted.is_(False))
            .group_by(User.role)
        ).all()
        return [RoleDistribution(role=row[0], count=row[1]) for row in rows]

    def get_user_registration_trends(self, session: Session) -> list[UserTrend]:
        now = get_now_manila()
        thirty_days_ago = now - timedelta(days=30)
        
        date_label = func.date(User.created_at).label('date')
        rows = session.exec(
            select(date_label, func.count(User.id))
            .where(User.created_at >= thirty_days_ago)
            .where(User.is_deleted.is_(False))
            .group_by(date_label)
            .order_by(date_label)
        ).all()
        return [UserTrend(date=str(row[0]), count=row[1]) for row in rows]

    def get_system_registry_counts(self, session: Session) -> list[SystemRegistry]:
        counts = [
            ("Inventory Items", InventoryItem),
            ("Inventory Units", InventoryUnit),
            ("Borrow Requests", BorrowRequest),
            ("Inventory Movements", InventoryMovement),
            ("Audit Logs", AuditLog),
        ]
        
        results = []
        for label, model in counts:
            count = session.exec(select(func.count(model.id))).one()
            results.append(SystemRegistry(entity=label, count=count))
        return results
