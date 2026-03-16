import random
import string
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlmodel import Field, Relationship

from core.base_model import BaseModel
from utils.time_utils import get_now_manila


def _generate_id(prefix: str) -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}-{suffix}"


class BackupRun(BaseModel, table=True):
    __tablename__ = "backup_runs"

    backup_id: str = Field(
        default_factory=lambda: _generate_id("BKRP"),
        unique=True,
        index=True,
        max_length=20,
    )
    started_at: datetime = Field(default_factory=get_now_manila)
    completed_at: Optional[datetime] = Field(default=None)
    status: str = Field(
        default="pending", max_length=20
    )  # pending, running, completed, failed
    destination: str = Field(max_length=100)  # local, s3, both
    checksum: Optional[str] = Field(default=None, max_length=255)
    triggered_by: Optional[UUID] = Field(
        default=None, foreign_key="users.id", index=True
    )

    artifacts: List["BackupArtifact"] = Relationship(back_populates="run")


class BackupArtifact(BaseModel, table=True):
    __tablename__ = "backup_artifacts"

    artifact_id: str = Field(
        default_factory=lambda: _generate_id("ARTI"),
        unique=True,
        index=True,
        max_length=20,
    )
    backup_run_id: UUID = Field(foreign_key="backup_runs.id", index=True)

    target_type: str = Field(max_length=20)  # local, s3
    file_path_or_key: str = Field(max_length=255)
    size_bytes: Optional[int] = Field(default=None)
    checksum: Optional[str] = Field(default=None, max_length=255)
    verified_restore: bool = Field(default=False)

    run: BackupRun = Relationship(back_populates="artifacts")
