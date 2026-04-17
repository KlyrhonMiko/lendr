import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlmodel import Session

from core.database import engine
from systems.admin.services.backup_service import backup_service
from systems.admin.services.archive_service import archive_service
from systems.admin.services.configuration_service import ConfigurationService
from systems.admin.services.user_service import UserService
from utils.logging import log_operation
from utils.time_utils import DEFAULT_TZ

logger = logging.getLogger("app")

class SchedulerService:
    def __init__(self):
        self.scheduler = BackgroundScheduler(timezone=DEFAULT_TZ)
        self.config_service = ConfigurationService()
        self.user_service = UserService()
        self.job_id = "automated_backup"
        self.ops_job_id = "operations_maintenance"

    def start(self):
        """Start the scheduler if not already running."""
        if not self.scheduler.running:
            self.scheduler.start()
            log_operation("SCHEDULER-START", "Background scheduler started")
            # Initial sync from DB
            self.sync_schedule()

    def shutdown(self):
        """Shutdown the scheduler."""
        if self.scheduler.running:
            self.scheduler.shutdown()
            log_operation("SCHEDULER-STOP", "Background scheduler stopped")

    def sync_schedule(self):
        """Synchronize the backup job with current database configuration."""
        with Session(engine) as session:
            category = "operations_settings"
            enabled = self.config_service.get_value(session, "backup_enabled", "true", category=category).lower() == "true"
            frequency = self.config_service.get_value(session, "backup_frequency", "daily", category=category)
            time_str = self.config_service.get_value(session, "backup_time", "02:00", category=category)

            # Remove existing job if any
            if self.scheduler.get_job(self.job_id):
                self.scheduler.remove_job(self.job_id)

            if not enabled:
                log_operation("SCHEDULER-SYNC", "Automated backups are DISABLED in configuration")
                return

            try:
                hour, minute = map(int, time_str.split(":"))
                
                if frequency == "daily":
                    trigger = CronTrigger(hour=hour, minute=minute, timezone=DEFAULT_TZ)
                elif frequency == "weekly":
                    # Default to Monday if weekly
                    trigger = CronTrigger(day_of_week="mon", hour=hour, minute=minute, timezone=DEFAULT_TZ)
                elif frequency == "monthly":
                    # Default to 1st of month
                    trigger = CronTrigger(day=1, hour=hour, minute=minute, timezone=DEFAULT_TZ)
                else:
                    logger.warning(f"Unknown backup frequency: {frequency}. Falling back to daily.")
                    trigger = CronTrigger(hour=hour, minute=minute, timezone=DEFAULT_TZ)

                self.scheduler.add_job(
                    self._run_backup_job,
                    trigger=trigger,
                    id=self.job_id,
                    name="Automated Database Backup",
                    replace_existing=True
                )
                
                next_run = self.scheduler.get_job(self.job_id).next_run_time
                log_operation("SCHEDULER-SYNC", f"Backup scheduled: {frequency} at {time_str}. Next run: {next_run}")

            except Exception as e:
                logger.error(f"Failed to sync backup schedule: {str(e)}")

            # 2. Sync Operations Maintenance (Archive/Purge) - Configurable Schedule
            try:
                if self.scheduler.get_job(self.ops_job_id):
                    self.scheduler.remove_job(self.ops_job_id)
                
                maint_time = self.config_service.get_value(session, "maintenance_schedule_time", "03:00", category=category)
                maint_hour, maint_minute = map(int, maint_time.split(":"))

                # Operations job runs nightly
                trigger_ops = CronTrigger(hour=maint_hour, minute=maint_minute, timezone=DEFAULT_TZ)
                self.scheduler.add_job(
                    self._run_ops_maintenance_job,
                    trigger=trigger_ops,
                    id=self.ops_job_id,
                    name="System Archival & Data Retention",
                    replace_existing=True
                )
                log_operation("SCHEDULER-SYNC", f"Operations maintenance scheduled daily at {maint_time}.")
            except Exception as e:
                logger.error(f"Failed to sync operations schedule: {str(e)}")

    def _run_backup_job(self):
        """The actual task performed by the scheduler."""
        log_operation("BACKUP-AUTO-START", "Starting scheduled automated backup")
        try:
            with Session(engine) as session:
                # We use destination='local' as per user request for straightforward local backups
                backup_service.trigger_backup(session, destination="local", actor_id=None)
            log_operation("BACKUP-AUTO-DONE", "Scheduled automated backup completed")
        except Exception as e:
            log_operation("BACKUP-AUTO-FAIL", f"Scheduled automated backup failed: {str(e)}", level="ERROR")

    def _run_ops_maintenance_job(self):
        """Perform nightly archival and data retention purging."""
        log_operation("OPS-MAINT-START", "Starting scheduled system operations maintenance")
        try:
            # 1. Archive cycle
            archive_service.run_archive_cycle(actor_id=None)
            
            # 2. Purge cycle
            archive_service.run_purge_cycle(actor_id=None)

            # 3. Secondary password due-rotation cycle
            with Session(engine) as session:
                rotated_count = self.user_service.rotate_due_secondary_passwords(session, actor_id=None)
                if rotated_count:
                    session.commit()
                    log_operation(
                        "SEC-PASS-ROTATE",
                        f"Rotated {rotated_count} secondary password(s) due for expiration",
                    )
            
            log_operation("OPS-MAINT-DONE", "Scheduled system operations maintenance completed")
        except Exception as e:
            log_operation("OPS-MAINT-FAIL", f"Scheduled system operations maintenance failed: {str(e)}", level="ERROR")

scheduler_service = SchedulerService()
