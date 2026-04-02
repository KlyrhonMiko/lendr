from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, field_serializer

from utils.time_utils import format_datetime


class BackupArtifactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    artifact_id: str

    target_type: str
    file_path_or_key: str
    size_bytes: Optional[int] = None
    checksum: Optional[str] = None
    verified_restore: bool
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> str:
        return format_datetime(dt)

class BackupRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    backup_id: str

    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str
    destination: str
    checksum: Optional[str] = None
    artifacts: list[BackupArtifactRead] = []

    @field_serializer("started_at", "completed_at")
    def serialize_run_timestamps(self, dt: datetime | None) -> str:
        return format_datetime(dt)

class BackupTrigger(BaseModel):
    destination: Literal["local"] = "local"
