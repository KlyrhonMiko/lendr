from typing import List, Literal
from pydantic import BaseModel, Field

class MaintenanceModeSettings(BaseModel):
    enabled: bool = Field(default=False)
    message: str = Field(default="The system is currently undergoing scheduled maintenance. Please check back later.")

class BackupScheduleSettings(BaseModel):
    enabled: bool = Field(default=False)
    frequency: Literal["daily", "weekly", "monthly"] = Field(default="daily")
    time: str = Field(default="02:00", pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")

class ArchivePolicySettings(BaseModel):
    audit_logs_value: int = Field(default=90)
    audit_logs_unit: str = Field(default="d")
    borrow_records_value: int = Field(default=1)
    borrow_records_unit: str = Field(default="y")

class RetentionPolicySettings(BaseModel):
    auto_delete: bool = Field(default=True)
    delete_older_than_value: int = Field(default=7)
    delete_older_than_unit: str = Field(default="y")
    exclusion_list: List[str] = Field(default=["Financial Audit", "Asset History", "Legal Holds"])
    maintenance_time: str = Field(default="03:00")

class OperationsSettingsPayload(BaseModel):
    maintenance: MaintenanceModeSettings = Field(default_factory=MaintenanceModeSettings)
    backup_schedule: BackupScheduleSettings = Field(default_factory=BackupScheduleSettings)
    archive_policy: ArchivePolicySettings = Field(default_factory=ArchivePolicySettings)
    retention_policy: RetentionPolicySettings = Field(default_factory=RetentionPolicySettings)
