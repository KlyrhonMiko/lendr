import os
from datetime import datetime
import time
import psutil
import re
from uuid import UUID
from typing import List
from sqlmodel import Session, select, text

from systems.auth.models.user_session import UserSession
from systems.admin.models.user import User
from systems.admin.schemas.health import (
    SystemStatusRead,
    StorageInfoRead,
    StorageBreakdownRead,
    ActiveSessionRead,
    ActiveUserRead,
    LogEntryRead
)
from utils.time_utils import get_now_manila

# Constants for storage scanning
HEALTH_LOG_FILE = ".logs/health/health.log"
BACKUP_DIR = "./.backups"
ATTACHMENTS_DIR = "./uploads" # Assuming this is the standard location

class SystemHealthService:
    def __init__(self):
        # Ensure essential directories exist for scanning (backups handled by BackupService)
        for d in [".logs/health", ATTACHMENTS_DIR]:
            if not os.path.exists(d):
                os.makedirs(d)

    def _format_uptime(self, seconds: float) -> str:
        days = int(seconds // (24 * 3600))
        seconds %= (24 * 3600)
        hours = int(seconds // 3600)
        seconds %= 3600
        minutes = int(seconds // 60)
        return f"{days}d {hours:02d}h {minutes:02d}m"

    def _get_dir_size(self, path: str) -> int:
        total_size = 0
        if not os.path.exists(path):
            return 0
        for dirpath, dirnames, filenames in os.walk(path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                # skip if it is symbolic link
                if not os.path.islink(fp):
                    total_size += os.path.getsize(fp)
        return total_size

    def get_system_status(self, session: Session) -> SystemStatusRead:
        # 1. Uptime
        boot_time = psutil.boot_time()
        uptime_seconds = time.time() - boot_time
        uptime_formatted = self._format_uptime(uptime_seconds)

        # 2. CPU and Memory
        cpu_usage = psutil.cpu_percent(interval=0.1)
        memory_usage = psutil.virtual_memory().percent

        # 3. Database Status
        db_health = "Offline"
        active_connections = 0
        try:
            session.exec(text("SELECT 1")).first()
            db_health = "Healthy"
            result = session.exec(text("SELECT count(*) FROM pg_stat_activity")).first()
            active_connections = result[0] if result else 0
        except Exception:
            pass

        return SystemStatusRead(
            registry_status="Connected", # Assuming Connected if this code is running
            database_health=db_health,
            uptime_formatted=uptime_formatted,
            uptime_seconds=uptime_seconds,
            cpu_usage_percent=cpu_usage,
            memory_usage_percent=memory_usage,
            active_db_connections=active_connections
        )

    def get_storage_info(self, session: Session) -> StorageInfoRead:
        disk_usage = psutil.disk_usage("/")
        
        # Breakdown calculation
        db_size_bytes = 0
        try:
            result = session.exec(text("SELECT pg_database_size(current_database())")).first()
            db_size_bytes = result[0] if result else 0
        except Exception:
            pass

        log_size_bytes = os.path.getsize(HEALTH_LOG_FILE) if os.path.exists(HEALTH_LOG_FILE) else 0
        backup_size_bytes = self._get_dir_size(BACKUP_DIR)
        attachment_size_bytes = self._get_dir_size(ATTACHMENTS_DIR)

        known_usage = db_size_bytes + log_size_bytes + backup_size_bytes + attachment_size_bytes
        other_usage = disk_usage.used - known_usage
        if other_usage < 0:
            other_usage = 0

        return StorageInfoRead(
            total_space_bytes=disk_usage.total,
            used_space_bytes=disk_usage.used,
            free_space_bytes=disk_usage.free,
            breakdown=StorageBreakdownRead(
                database=db_size_bytes,
                logs=log_size_bytes,
                attachments=attachment_size_bytes,
                backups=backup_size_bytes,
                other=other_usage
            )
        )

    def get_active_sessions(self, session: Session, skip: int = 0, limit: int = 20) -> List[ActiveSessionRead]:
        now = get_now_manila()
        statement = (
            select(UserSession, User)
            .join(User, UserSession.user_uuid == User.id, isouter=True)
            .where(not UserSession.is_revoked)
            .where(UserSession.expires_at > now)
            .where(not UserSession.is_deleted)
            .offset(skip).limit(limit)
        )
        
        results = session.exec(statement).all()
        active_sessions = []
        for us_model, u_model in results:
            user_data = ActiveUserRead(
                id=u_model.id,
                username=u_model.username,
                full_name=u_model.full_name,
                role_name=u_model.role if u_model else "User"
            ) if u_model else None
            
            active_sessions.append(ActiveSessionRead(
                session_id=us_model.session_id,
                user=user_data,
                issued_at=us_model.issued_at,
                expires_at=us_model.expires_at,
                device_id=us_model.device_id
            ))
            
        return active_sessions

    def terminate_session(self, session: Session, session_id: str, actor_id: UUID) -> bool:
        statement = select(UserSession).where(UserSession.session_id == session_id)
        session_obj = session.exec(statement).first()
        if not session_obj:
            return False
            
        session_obj.is_revoked = True
        session_obj.is_deleted = True
        session.add(session_obj)
        session.commit()
        return True

    def get_recent_logs(self, skip: int = 0, limit: int = 100) -> tuple[List[LogEntryRead], int]:
        if not os.path.exists(HEALTH_LOG_FILE):
            return [], 0

        logs = []
        # Pattern to capture: Timestamp [LEVEL] [CODE] Message OR Timestamp [LEVEL] Message
        log_pattern = re.compile(r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] (?:\[([\w-]+)\] )?(.+)$")

        try:
            with open(HEALTH_LOG_FILE, "r") as f:
                lines = f.readlines()
                total_lines = len(lines)
                
                # We want newest first, so we process all and reverse, then slice
                # For better performance on very large files, this would need optimization
                for line in lines:
                    match = log_pattern.match(line.strip())
                    if not match:
                        continue
                    
                    timestamp, level, code, message = match.groups()
                    
                    severity = "Info"
                    lvl_upper = level.upper()
                    if lvl_upper in ["ERROR", "CRITICAL"]:
                        severity = "Critical"
                    elif lvl_upper == "WARNING":
                        severity = "Warning"

                    # Parse the timestamp string into a datetime object
                    # Logs are written in Manila time (system local)
                    from utils.time_utils import DEFAULT_TZ
                    try:
                        dt_timestamp = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S").replace(tzinfo=DEFAULT_TZ)
                    except ValueError:
                        # Fallback if format differs
                        dt_timestamp = get_now_manila()
                    
                    logs.append(LogEntryRead(
                        timestamp=dt_timestamp,
                        code=code or f"{lvl_upper}-EVENT",
                        message=message,
                        level=level,
                        severity=severity
                    ))
                
                # Reverse for newest first
                logs = logs[::-1]
                
                # Apply pagination
                paginated_logs = logs[skip : skip + limit]
                return paginated_logs, total_lines
        except Exception:
            return [], 0
