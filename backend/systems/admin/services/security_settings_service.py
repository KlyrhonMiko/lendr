import json
from datetime import datetime
from uuid import UUID

from fastapi import HTTPException
from sqlmodel import Session, select

from systems.admin.models.user import User
from systems.admin.schemas.security_settings import (
    RbacOverviewSettings,
    RbacRoleDefinition,
    SecuritySettingsPayload,
)
from systems.admin.services.audit_service import audit_service
from systems.admin.services.shift_definitions_service import ShiftDefinitionsService
from systems.auth.services.configuration_service import AuthConfigService
from systems.auth.services.rbac_service import rbac_service


SECURITY_SETTINGS_CATEGORY = "security_settings"
USERS_ROLE_CATEGORY = "users_role"
RBAC_ROLES_CATEGORY = "rbac_roles"

KEY_TWO_FACTOR_ENABLED = "two_factor_enabled"
KEY_TWO_FACTOR_METHOD = "two_factor_method"
KEY_TWO_FACTOR_ENFORCE_FOR_ROLES = "two_factor_enforce_for_roles"
KEY_TWO_FACTOR_ENFORCE_ON = "two_factor_enforce_on"
KEY_PASSWORD_MIN_LENGTH = "password_min_length"
KEY_PASSWORD_REQUIRE_UPPERCASE = "password_require_uppercase"
KEY_PASSWORD_REQUIRE_LOWERCASE = "password_require_lowercase"
KEY_PASSWORD_REQUIRE_NUMBER = "password_require_number"
KEY_PASSWORD_REQUIRE_SPECIAL = "password_require_special"
KEY_PASSWORD_APPLIES_WHEN_ROLE_NOT_IN = "password_applies_when_role_not_in"
KEY_SESSION_INACTIVE_MINUTES = "session_inactive_minutes"
KEY_SESSION_WARNING_MINUTES = "session_warning_minutes"
KEY_SECONDARY_PASSWORD_ROTATION_INTERVAL_DAYS = "secondary_password_rotation_interval_days"

SECURITY_UPDATE_DESCRIPTIONS = {
    KEY_TWO_FACTOR_ENABLED: "Enable or disable mandatory two-factor authentication policy.",
    KEY_TWO_FACTOR_METHOD: "Two-factor method policy for the security settings page.",
    KEY_TWO_FACTOR_ENFORCE_FOR_ROLES: "Roles that require authenticator-app two-factor verification.",
    KEY_TWO_FACTOR_ENFORCE_ON: "When two-factor requirements are enforced for covered roles.",
    KEY_PASSWORD_MIN_LENGTH: "Minimum required password length.",
    KEY_PASSWORD_REQUIRE_UPPERCASE: "Require uppercase characters in passwords.",
    KEY_PASSWORD_REQUIRE_LOWERCASE: "Require lowercase characters in passwords.",
    KEY_PASSWORD_REQUIRE_NUMBER: "Require numeric characters in passwords.",
    KEY_PASSWORD_REQUIRE_SPECIAL: "Require special characters in passwords.",
    KEY_PASSWORD_APPLIES_WHEN_ROLE_NOT_IN: "Roles excluded from password rule enforcement.",
    KEY_SESSION_INACTIVE_MINUTES: "Session inactivity timeout duration in minutes.",
    KEY_SESSION_WARNING_MINUTES: "Session timeout warning lead time in minutes.",
    KEY_SECONDARY_PASSWORD_ROTATION_INTERVAL_DAYS: "How often secondary passwords rotate automatically in days.",
}


def _parse_bool(value: str, default: bool) -> bool:
    normalized = (value or "").strip().lower()
    if normalized in {"true", "1", "yes", "on"}:
        return True
    if normalized in {"false", "0", "no", "off"}:
        return False
    return default


def _parse_int(value: str, default: int) -> int:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return default


def _parse_json_str_list(value: str, default: list[str]) -> list[str]:
    try:
        parsed = json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return default
    if not isinstance(parsed, list):
        return default
    normalized = [str(item).strip().lower() for item in parsed if str(item).strip()]
    return list(dict.fromkeys(normalized)) or default


class SecuritySettingsService:
    def __init__(self) -> None:
        self.auth_config_service = AuthConfigService()
        self.shift_definitions_service = ShiftDefinitionsService(
            auth_config_service=self.auth_config_service,
        )

    def _resolve_known_roles(self, session: Session) -> set[str]:
        return {
            str(setting.key).strip().lower()
            for setting in self.auth_config_service.get_by_category(session, USERS_ROLE_CATEGORY)
        }

    def _get_security_setting_value(
        self,
        session: Session,
        *,
        key: str,
        default: str,
    ) -> str:
        return self.auth_config_service.get_value(
            session,
            key,
            default,
            category=SECURITY_SETTINGS_CATEGORY,
        )

    def _resolve_rbac_last_updated_at(self, session: Session) -> datetime | None:
        rbac_settings = self.auth_config_service.get_by_category(session, RBAC_ROLES_CATEGORY)
        return max((setting.updated_at for setting in rbac_settings), default=None) if rbac_settings else None

    def _resolve_user_count_by_role(self, session: Session) -> dict[str, int]:
        roles = session.exec(select(User.role).where(User.is_deleted.is_(False))).all()
        counts: dict[str, int] = {}
        for role in roles:
            normalized = str(role).strip().lower()
            if not normalized:
                continue
            counts[normalized] = counts.get(normalized, 0) + 1
        return counts

    def build_rbac_overview(self, session: Session) -> RbacOverviewSettings:
        role_policies = rbac_service.get_role_policies(session)
        role_counts = self._resolve_user_count_by_role(session)
        ordered_roles = [
            str(setting.key).strip().lower()
            for setting in self.auth_config_service.get_by_category(session, USERS_ROLE_CATEGORY)
        ]
        for role_key in sorted(role_policies.keys()) + sorted(role_counts.keys()):
            if role_key not in ordered_roles:
                ordered_roles.append(role_key)

        role_definitions = [
            RbacRoleDefinition(
                role=role_key,
                display_name=str(
                    (role_policies.get(role_key) or rbac_service.get_role_policy(session, role_key)).get(
                        "display_name"
                    )
                    or role_key.replace("_", " ").title()
                ),
                systems=[
                    str(system)
                    for system in (role_policies.get(role_key) or {}).get("systems", [])
                ],
                permissions=[
                    str(permission)
                    for permission in (role_policies.get(role_key) or {}).get("permissions", [])
                ],
                user_count=role_counts.get(role_key, 0),
            )
            for role_key in ordered_roles
        ]

        return RbacOverviewSettings(
            policy_source="rbac_roles",
            last_updated_at=self._resolve_rbac_last_updated_at(session),
            role_definitions=role_definitions,
        )

    def build_payload(self, session: Session) -> SecuritySettingsPayload:
        known_roles = self._resolve_known_roles(session)
        default_two_factor_roles = ["admin", "manager", "staff"]
        enforce_roles = _parse_json_str_list(
            self._get_security_setting_value(
                session,
                key=KEY_TWO_FACTOR_ENFORCE_FOR_ROLES,
                default=json.dumps(default_two_factor_roles),
            ),
            default_two_factor_roles,
        )
        if known_roles:
            filtered_roles = [role for role in enforce_roles if role in known_roles]
            enforce_roles = filtered_roles or enforce_roles

        return SecuritySettingsPayload.model_validate(
            {
                "two_factor": {
                    "enabled": _parse_bool(
                        self._get_security_setting_value(
                            session,
                            key=KEY_TWO_FACTOR_ENABLED,
                            default="true",
                        ),
                        True,
                    ),
                    "method": self._get_security_setting_value(
                        session,
                        key=KEY_TWO_FACTOR_METHOD,
                        default="authenticator_app",
                    ),
                    "enforce_for_roles": enforce_roles,
                    "enforce_on": self._get_security_setting_value(
                        session,
                        key=KEY_TWO_FACTOR_ENFORCE_ON,
                        default="next_login",
                    ),
                },
                "password_rules": {
                    "min_length": _parse_int(
                        self._get_security_setting_value(
                            session,
                            key=KEY_PASSWORD_MIN_LENGTH,
                            default="6",
                        ),
                        6,
                    ),
                    "require_uppercase": _parse_bool(
                        self._get_security_setting_value(
                            session,
                            key=KEY_PASSWORD_REQUIRE_UPPERCASE,
                            default="false",
                        ),
                        False,
                    ),
                    "require_lowercase": _parse_bool(
                        self._get_security_setting_value(
                            session,
                            key=KEY_PASSWORD_REQUIRE_LOWERCASE,
                            default="false",
                        ),
                        False,
                    ),
                    "require_number": _parse_bool(
                        self._get_security_setting_value(
                            session,
                            key=KEY_PASSWORD_REQUIRE_NUMBER,
                            default="false",
                        ),
                        False,
                    ),
                    "require_special": _parse_bool(
                        self._get_security_setting_value(
                            session,
                            key=KEY_PASSWORD_REQUIRE_SPECIAL,
                            default="false",
                        ),
                        False,
                    ),
                    "applies_when_role_not_in": _parse_json_str_list(
                        self._get_security_setting_value(
                            session,
                            key=KEY_PASSWORD_APPLIES_WHEN_ROLE_NOT_IN,
                            default=json.dumps(["borrower", "dispatch"]),
                        ),
                        ["borrower", "dispatch"],
                    ),
                },
                "session_timeout": {
                    "inactive_minutes": _parse_int(
                        self._get_security_setting_value(
                            session,
                            key=KEY_SESSION_INACTIVE_MINUTES,
                            default="30",
                        ),
                        30,
                    ),
                    "warning_minutes": _parse_int(
                        self._get_security_setting_value(
                            session,
                            key=KEY_SESSION_WARNING_MINUTES,
                            default="5",
                        ),
                        5,
                    ),
                },
                "secondary_password": {
                    "rotation_interval_days": _parse_int(
                        self._get_security_setting_value(
                            session,
                            key=KEY_SECONDARY_PASSWORD_ROTATION_INTERVAL_DAYS,
                            default="30",
                        ),
                        30,
                    ),
                },
                "rbac_overview": self.build_rbac_overview(session).model_dump(mode="json"),
                "shift_definitions": self.shift_definitions_service.build(session).model_dump(mode="json"),
            }
        )

    def update_payload(
        self,
        session: Session,
        payload: SecuritySettingsPayload,
        actor_id: UUID,
    ) -> SecuritySettingsPayload:
        known_roles = self._resolve_known_roles(session)
        unknown_roles = [
            role for role in payload.two_factor.enforce_for_roles if known_roles and role not in known_roles
        ]
        if unknown_roles:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Unknown roles in two_factor.enforce_for_roles: "
                    + ", ".join(unknown_roles)
                ),
            )

        before_payload = self.build_payload(session)
        updates = {
            KEY_TWO_FACTOR_ENABLED: str(payload.two_factor.enabled).lower(),
            KEY_TWO_FACTOR_METHOD: payload.two_factor.method,
            KEY_TWO_FACTOR_ENFORCE_FOR_ROLES: json.dumps(payload.two_factor.enforce_for_roles),
            KEY_TWO_FACTOR_ENFORCE_ON: payload.two_factor.enforce_on,
            KEY_PASSWORD_MIN_LENGTH: str(payload.password_rules.min_length),
            KEY_PASSWORD_REQUIRE_UPPERCASE: str(payload.password_rules.require_uppercase).lower(),
            KEY_PASSWORD_REQUIRE_LOWERCASE: str(payload.password_rules.require_lowercase).lower(),
            KEY_PASSWORD_REQUIRE_NUMBER: str(payload.password_rules.require_number).lower(),
            KEY_PASSWORD_REQUIRE_SPECIAL: str(payload.password_rules.require_special).lower(),
            KEY_PASSWORD_APPLIES_WHEN_ROLE_NOT_IN: json.dumps(payload.password_rules.applies_when_role_not_in),
            KEY_SESSION_INACTIVE_MINUTES: str(payload.session_timeout.inactive_minutes),
            KEY_SESSION_WARNING_MINUTES: str(payload.session_timeout.warning_minutes),
            KEY_SECONDARY_PASSWORD_ROTATION_INTERVAL_DAYS: str(payload.secondary_password.rotation_interval_days),
        }

        for key, value in updates.items():
            self.auth_config_service.set_value(
                session,
                key,
                value,
                category=SECURITY_SETTINGS_CATEGORY,
                description=SECURITY_UPDATE_DESCRIPTIONS[key],
                actor_id=actor_id,
            )

        self.shift_definitions_service.persist(
            session,
            payload.shift_definitions,
            actor_id=actor_id,
        )

        after_payload = self.build_payload(session)
        audit_service.log_action(
            db=session,
            entity_type="security_settings",
            entity_id="security_policy",
            action="updated",
            reason_code="admin_security_policy_update",
            actor_id=actor_id,
            before=before_payload.model_dump(mode="json"),
            after=after_payload.model_dump(mode="json"),
        )
        return after_payload


security_settings_service = SecuritySettingsService()
