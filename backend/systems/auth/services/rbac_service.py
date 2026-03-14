import json

from sqlmodel import Session

from systems.admin.models.user import User
from systems.admin.services.configuration_service import ConfigurationService


def _normalize_role(role: str) -> str:
    return role.strip().lower().replace("-", "_").replace(" ", "_")


DEFAULT_ROLE_POLICIES: dict[str, dict[str, list[str] | str]] = {
    "dispatch": {
        "display_name": "Dispatch",
        "systems": ["inventory", "operations", "admin"],
        "permissions": ["auth:me", "borrower:access"],
    },
    "borrowers": {
        "display_name": "Borrowers",
        "systems": ["inventory", "operations", "admin"],
        "permissions": ["auth:me", "borrower:access"],
    },
    "employees": {
        "display_name": "Employees",
        "systems": ["inventory", "operations", "admin"],
        "permissions": ["auth:me", "borrower:access"],
    },
    "inventory_manager": {
        "display_name": "Inventory Manager",
        "systems": ["inventory"],
        "permissions": [
            "auth:me",
            "inventory:manage",
            "borrowing:manage",
            "requested_items:manage",
            "dashboard:view",
            "audit:view",
            "config:view",
            "config:manage",
            "borrower:access",
        ],
    },
    "accountant": {
        "display_name": "Accountant",
        "systems": ["operations"],
        "permissions": ["auth:me", "operations:manage"],
    },
    "finance_manager": {
        "display_name": "Finance Manager",
        "systems": ["operations"],
        "permissions": ["auth:me", "operations:manage"],
    },
    "admin": {
        "display_name": "Admin",
        "systems": ["*"],
        "permissions": ["*"],
    },
}


class RBACService:
    def __init__(self):
        self.config_service = ConfigurationService()

    def _build_policies(self, session: Session) -> dict[str, dict[str, list[str] | str]]:
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
            role_key = _normalize_role(setting.key)
            try:
                parsed = json.loads(setting.value)
                if not isinstance(parsed, dict):
                    continue
            except json.JSONDecodeError:
                continue

            base = policies.get(
                role_key,
                {
                    "display_name": setting.description or setting.key,
                    "systems": [],
                    "permissions": ["auth:me"],
                },
            )

            systems = parsed.get("systems", base["systems"])
            permissions = parsed.get("permissions", base["permissions"])
            display_name = parsed.get("display_name", base["display_name"])

            if isinstance(systems, list) and isinstance(permissions, list):
                policies[role_key] = {
                    "display_name": str(display_name),
                    "systems": [str(system).lower() for system in systems],
                    "permissions": [str(permission) for permission in permissions],
                }

        return policies

    def get_role_policy(self, session: Session, role: str | None) -> dict[str, list[str] | str]:
        normalized = _normalize_role(role or "")
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
        allowed_permissions = [str(value) for value in policy.get("permissions", [])]
        return "*" in allowed_permissions or permission in allowed_permissions


rbac_service = RBACService()