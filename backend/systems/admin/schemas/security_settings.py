from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TwoFactorSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool = Field(default=True)
    method: Literal["authenticator_app"] = Field(default="authenticator_app")
    enforce_for_roles: list[str] = Field(default_factory=lambda: ["admin", "manager", "staff"])
    enforce_on: Literal["next_login"] = Field(default="next_login")

    @field_validator("enforce_for_roles")
    @classmethod
    def normalize_roles(cls, roles: list[str]) -> list[str]:
        normalized = [role.strip().lower() for role in roles if role.strip()]
        if not normalized:
            raise ValueError("enforce_for_roles must contain at least one role")
        return list(dict.fromkeys(normalized))


class PasswordRulesSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    min_length: int = Field(default=6, ge=6, le=128)
    require_uppercase: bool = Field(default=False)
    require_lowercase: bool = Field(default=False)
    require_number: bool = Field(default=False)
    require_special: bool = Field(default=False)
    applies_when_role_not_in: list[str] = Field(default_factory=lambda: ["borrower", "dispatch"])

    @field_validator("applies_when_role_not_in")
    @classmethod
    def normalize_excluded_roles(cls, roles: list[str]) -> list[str]:
        normalized = [role.strip().lower() for role in roles if role.strip()]
        if not normalized:
            raise ValueError("applies_when_role_not_in must contain at least one role")
        return list(dict.fromkeys(normalized))


class SessionTimeoutSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    inactive_minutes: int = Field(default=30, ge=5, le=1440)
    warning_minutes: int = Field(default=5, ge=1, le=60)

    @field_validator("warning_minutes")
    @classmethod
    def validate_warning_window(cls, warning_minutes: int, info) -> int:
        inactive_minutes = info.data.get("inactive_minutes", 30)
        if warning_minutes >= inactive_minutes:
            raise ValueError("warning_minutes must be less than inactive_minutes")
        return warning_minutes


class SecondaryPasswordSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rotation_interval_days: int = Field(default=30, ge=1, le=365)


class RbacRoleDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: str = Field(min_length=1, max_length=50)
    display_name: str = Field(min_length=1, max_length=100)
    systems: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    user_count: int = Field(default=0, ge=0)

    @field_validator("role")
    @classmethod
    def normalize_role(cls, role: str) -> str:
        normalized = role.strip().lower()
        if not normalized:
            raise ValueError("role must not be empty")
        return normalized


class RbacOverviewSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    policy_source: Literal["rbac_roles"] = Field(default="rbac_roles")
    last_updated_at: datetime | None = Field(default=None)
    role_definitions: list[RbacRoleDefinition] = Field(default_factory=list)


class ShiftDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str = Field(min_length=1, max_length=50)
    label: str = Field(min_length=1, max_length=100)
    start: str = Field(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    end: str = Field(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    days: list[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5], min_length=1)

    @field_validator("key")
    @classmethod
    def normalize_key(cls, key: str) -> str:
        normalized = key.strip().lower()
        if not normalized:
            raise ValueError("key must not be empty")
        return normalized

    @field_validator("days")
    @classmethod
    def normalize_days(cls, days: list[int]) -> list[int]:
        normalized = list(dict.fromkeys(days))
        if any(day < 0 or day > 6 for day in normalized):
            raise ValueError("days must contain values from 0 to 6")
        return normalized


class ShiftDefinitionsSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_category: Literal["users_shift_type"] = Field(default="users_shift_type")
    values: list[str] = Field(default_factory=list)
    definitions: list[ShiftDefinition] = Field(default_factory=list)

    @field_validator("values")
    @classmethod
    def normalize_values(cls, values: list[str]) -> list[str]:
        normalized = [value.strip().lower() for value in values if value.strip()]
        return list(dict.fromkeys(normalized))


class SecuritySettingsPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    two_factor: TwoFactorSettings = Field(default_factory=TwoFactorSettings)
    password_rules: PasswordRulesSettings = Field(default_factory=PasswordRulesSettings)
    session_timeout: SessionTimeoutSettings = Field(default_factory=SessionTimeoutSettings)
    secondary_password: SecondaryPasswordSettings = Field(default_factory=SecondaryPasswordSettings)
    rbac_overview: RbacOverviewSettings = Field(default_factory=RbacOverviewSettings)
    shift_definitions: ShiftDefinitionsSettings = Field(default_factory=ShiftDefinitionsSettings)
