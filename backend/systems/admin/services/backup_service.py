import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse
from uuid import UUID

from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from core.config import settings
from systems.admin.models.backup import BackupRun, BackupArtifact
from systems.admin.services.configuration_service import ConfigurationService
from utils.time_utils import get_now_manila
from utils.logging import log_operation


class BackupService:
    def __init__(self):
        # Use a path relative to the app root so it persists to the host via volume mount
        self.backup_dir = Path("./.backups")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.config_service = ConfigurationService()

    def _require_setting(self, session: Session, key: str, category: str, field_label: str) -> None:
        self.config_service.require_key(session, key=key, category=category, field_label=field_label)

    def trigger_backup(
        self,
        session: Session,
        destination: str = "local",
        actor_id: UUID | None = None,
    ) -> BackupRun:
        self._require_setting(
            session,
            destination,
            self.config_service.category_for("backup_runs", "destination"),
            "backup destination",
        )
        self._require_setting(
            session,
            "running",
            self.config_service.category_for("backup_runs", "status"),
            "backup run status",
        )

        # 1. Create the database record
        backup_run = BackupRun(
            destination=destination,
            triggered_by=actor_id,
            status="running"
        )
        session.add(backup_run)
        session.commit()
        session.refresh(backup_run)

        try:
            # 2. Execute local backup if requested
            if destination in ["local", "both"]:
                self._run_local_backup(session, backup_run)
            
            # 3. Execute S3 backup if requested
            if destination in ["s3", "both"]:
                self._run_s3_backup(session, backup_run)

            self._assert_required_artifacts(session, backup_run, destination)

            self._require_setting(
                session,
                "completed",
                self.config_service.category_for("backup_runs", "status"),
                "backup run status",
            )
            backup_run.status = "completed"
            backup_run.completed_at = get_now_manila()
            
            session.add(backup_run)
            session.commit()
            session.refresh(backup_run)
            
            log_operation("BACKUP-SUCCESS", f"Database backup {backup_run.id} completed successfully")
            
            return backup_run
            
        except Exception as e:
            self._require_setting(
                session,
                "failed",
                self.config_service.category_for("backup_runs", "status"),
                "backup run status",
            )
            backup_run.status = "failed"
            backup_run.completed_at = get_now_manila()
            session.add(backup_run)
            session.commit()
            
            error_msg = f"Backup {backup_run.backup_id} failed: {str(e)}"
            log_operation("BACKUP-FAIL", error_msg, level="ERROR")
            
            # We raise the exception so the API returns a proper 500 error instead of "Success"
            raise RuntimeError(error_msg) from e

    def _run_s3_backup(self, session: Session, backup_run: BackupRun) -> None:
        raise NotImplementedError(
            "S3 backup destination is not implemented yet. "
            "Use destination='local' until S3 uploader support is added."
        )

    def _assert_required_artifacts(
        self,
        session: Session,
        backup_run: BackupRun,
        destination: str,
    ) -> None:
        artifacts = session.exec(
            select(BackupArtifact).where(BackupArtifact.backup_run_id == backup_run.id)
        ).all()
        target_types = {artifact.target_type for artifact in artifacts}

        required_targets: set[str]
        if destination == "local":
            required_targets = {"local"}
        elif destination == "s3":
            required_targets = {"s3"}
        else:
            required_targets = {"local", "s3"}

        missing_targets = required_targets - target_types
        if missing_targets:
            missing = ", ".join(sorted(missing_targets))
            raise RuntimeError(f"Backup artifacts missing required targets: {missing}")

    def _run_local_backup(self, session: Session, backup_run: BackupRun):
        timestamp = get_now_manila().strftime("%Y%m%d_%H%M%S")
        filename = f"backup_{timestamp}.sql"
        filepath = self.backup_dir / filename
        # 1. Parse DB URL
        parsed = urlparse(settings.DATABASE_URL)
        
        # 2. Setup environment with password
        env = os.environ.copy()
        if parsed.password:
            env["PGPASSWORD"] = parsed.password
        # 3. Build the pg_dump command
        # Note: 'parsed.hostname' will be 'postgres' when running in Docker
        cmd = [
            "pg_dump",
            "-h", parsed.hostname or "postgres",
            "-p", str(parsed.port or 5432),
            "-U", parsed.username or "postgres",
            "-d", parsed.path.lstrip("/"),
            "-f", str(filepath)
        ]
        try:
            # 4. Run the command inside the backend container
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            
            if result.returncode != 0:
                raise Exception(f"pg_dump failed: {result.stderr}")
            # 5. Record the artifact
            self._require_setting(
                session,
                "local",
                self.config_service.category_for("backup_artifacts", "target_type"),
                "backup artifact target type",
            )
            artifact = BackupArtifact(
                backup_run_id=backup_run.id,
                target_type="local",
                file_path_or_key=str(filepath),
                size_bytes=filepath.stat().st_size,
                verified_restore=False
            )
            session.add(artifact)
        except Exception as e:
            if filepath.exists() and filepath.stat().st_size == 0:
                filepath.unlink()
            raise e


    def list_backup_runs(self, session: Session) -> list[BackupRun]:
        statement = select(BackupRun).options(selectinload(BackupRun.artifacts)).order_by(BackupRun.created_at.desc())
        return session.exec(statement).all()

    def get_backup_run(self, session: Session, backup_id: str) -> BackupRun | None:
        statement = select(BackupRun).where(BackupRun.backup_id == backup_id).options(selectinload(BackupRun.artifacts))
        return session.exec(statement).first()

    def get_artifact(self, session: Session, artifact_id: str) -> BackupArtifact | None:
        statement = select(BackupArtifact).where(BackupArtifact.artifact_id == artifact_id)
        return session.exec(statement).first()

backup_service = BackupService()
