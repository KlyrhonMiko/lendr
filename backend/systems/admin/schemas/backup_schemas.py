from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class BackupArtifactRead(BaseModel):
    artifact_id: str
    target_type: str
    file_path_or_key: str
    size_bytes: Optional[int] = None
    checksum: Optional[str] = None
    verified_restore: bool
    created_at: datetime

    class Config:
        from_attributes = True


class BackupRunRead(BaseModel):
    backup_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str
    destination: str
    checksum: Optional[str] = None
    triggered_by: Optional[UUID] = None
    artifacts: list[BackupArtifactRead] = []

    class Config:
        from_attributes = True


class BackupTrigger(BaseModel):
    destination: str = "local"  # local, s3, both
