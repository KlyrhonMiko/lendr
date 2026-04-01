import json
import re
from typing import Any

from sqlmodel import Session

from systems.admin.models.user import User
from systems.admin.services.configuration_service import ConfigurationService


PERMISSION_PATTERN = re.compile(r"^[a-z0-9_]+:[a-z0-9_]+:[a-z0-9_]+$")
SYSTEM_PATTERN = re.compile(r"^[a-z0-9_]+$")
ROLE_PATTERN = re.compile(r"^[a-z0-9_]+$")


def _normalize_identifier(value: Any) -> str:
    return str(value).strip().lower()


def normalize_role(role: str) -> str:
    return role.strip().lower().replace("-", "_").replace(" ", "_")


def is_valid_permission(permission: str) -> bool:
    return bool(PERMISSION_PATTERN.fullmatch(permission))


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        result.append(item)
    return result


def _validate_systems(role_key: str, systems: Any) -> list[str]:
    if not isinstance(systems, list) or not systems:
        raise ValueError("systems must be a non-empty list")

    normalized: list[str] = []
    for raw_system in systems:
        system = _normalize_identifier(raw_system)
        if not system:
            raise ValueError("systems cannot contain empty values")
        if system == "*":
            if role_key != "admin":
                raise ValueError("wildcard system access is only allowed for admin role")
            normalized.append(system)
            continue
        if not SYSTEM_PATTERN.fullmatch(system):
            raise ValueError(
                f"invalid system '{raw_system}'. Expected lowercase slug format"
            )
        normalized.append(system)

    return _dedupe(normalized)


def _validate_permissions(role_key: str, permissions: Any) -> list[str]:
    if not isinstance(permissions, list) or not permissions:
        raise ValueError("permissions must be a non-empty list")

    normalized: list[str] = []
    for raw_permission in permissions:
        permission = _normalize_identifier(raw_permission)
        if not permission:
            raise ValueError("permissions cannot contain empty values")
        if permission == "*":
            if role_key != "admin":
                raise ValueError(
                    "wildcard permission is only allowed for admin role"
                )
            normalized.append(permission)
            continue
        if not is_valid_permission(permission):
            raise ValueError(
                "invalid permission "
                f"'{raw_permission}'. Expected format system:resource:action"
            )
        normalized.append(permission)

    return _dedupe(normalized)


def validate_role_policy_payload(
    role: str,
    payload: dict[str, Any],
) -> dict[str, list[str] | str]:
    if not isinstance(payload, dict):
        raise ValueError("role policy payload must be an object")

    role_key = normalize_role(role)
    if not role_key or not ROLE_PATTERN.fullmatch(role_key):
        raise ValueError("role must be a lowercase slug")

    display_name_raw = payload.get("display_name")
    display_name = (
        str(display_name_raw).strip()
        if display_name_raw is not None
        else role_key.replace("_", " ").title()
    )
    if not display_name:
        raise ValueError("display_name cannot be empty")

    systems = _validate_systems(role_key, payload.get("systems"))
    permissions = _validate_permissions(role_key, payload.get("permissions"))

    return {
        "display_name": display_name,
        "systems": systems,
        "permissions": permissions,
    }


DEFAULT_ROLE_POLICIES: dict[str, dict[str, list[str] | str]] = {
    "admin": {
        "display_name": "Admin",
        "description": "Complete authority over user management, system configuration, and data overrides.",
        "systems": ["*"],
        "permissions": ["*"],
    },
}


class RBACService:
    def __init__(self):
        self.config_service = ConfigurationService()

    def _build_policies(
        self, session: Session
    ) -> dict[str, dict[str, list[str] | str]]:
        policies: dict[str, dict[str, list[str] | str]] = {
            role: {
                "display_name": str(policy["display_name"]),
                "systems": list(policy["systems"]),
                "permissions": list(policy["permissions"]),
            }
            for role, policy in DEFAULT_ROLE_POLICIES.items()
        }

        custom_settings = self.config_service.get_by_category(session, "rbac_roles")
        for setting in custom_settings:
            role_key = normalize_role(setting.key)
            try:
                parsed = json.loads(setting.value)
                if not isinstance(parsed, dict):
                    continue
                parsed.setdefault("display_name", setting.description or setting.key)
                policies[role_key] = validate_role_policy_payload(role_key, parsed)
            except json.JSONDecodeError:
                continue
            except ValueError:
                continue

        return policies

    def get_role_policy(
        self, session: Session, role: str | None
    ) -> dict[str, list[str] | str]:
        normalized = normalize_role(role or "")
        policies = self._build_policies(session)
        return policies.get(
            normalized,
            {
                "display_name": role or "Unknown",
                "systems": [],
                "permissions": ["auth:me"],
            },
        )

    def has_system_access(self, session: Session, user: User, system: str) -> bool:
        policy = self.get_role_policy(session, user.role)
        allowed_systems = [str(value).lower() for value in policy.get("systems", [])]

        return "*" in allowed_systems or system.lower() in allowed_systems

    def has_permission(self, session: Session, user: User, permission: str) -> bool:
        policy = self.get_role_policy(session, user.role)
        requested = _normalize_identifier(permission)
        allowed_permissions = [
            _normalize_identifier(value) for value in policy.get("permissions", [])
        ]

        return "*" in allowed_permissions or requested in allowed_permissions


rbac_service = RBACService()
