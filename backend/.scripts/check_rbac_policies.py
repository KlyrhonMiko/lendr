#!/usr/bin/env python3
"""Validate RBAC seed policies and permission references in backend routes."""

from __future__ import annotations

import ast
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _load_rbac_dependencies():
    from data.system_init_data import RBAC_ROLES
    from systems.auth.services.rbac_service import (
        is_valid_permission,
        normalize_role,
        validate_role_policy_payload,
    )

    return RBAC_ROLES, is_valid_permission, normalize_role, validate_role_policy_payload


def _extract_permissions_from_node(node: ast.AST) -> list[str]:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return [node.value.strip().lower()]

    if isinstance(node, (ast.List, ast.Tuple)):
        extracted: list[str] = []
        for item in node.elts:
            if isinstance(item, ast.Constant) and isinstance(item.value, str):
                extracted.append(item.value.strip().lower())
        return extracted

    return []


def _collect_permissions_from_code(root: Path) -> set[str]:
    permissions: set[str] = set()

    for file_path in root.rglob("*.py"):
        if ".venv" in file_path.parts or ".tests" in file_path.parts:
            continue
        source = file_path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(file_path))

        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            if not isinstance(node.func, ast.Name) or node.func.id != "require_permission":
                continue
            if not node.args:
                continue

            permissions.update(_extract_permissions_from_node(node.args[0]))

    return permissions


def _validate_seed_policies(
    rbac_roles: list[dict[str, object]],
    normalize_role,
    validate_role_policy_payload,
) -> list[str]:
    errors: list[str] = []
    for role_data in rbac_roles:
        role_raw = str(role_data.get("role", "")).strip()
        role_key = normalize_role(role_raw)
        payload = {
            "display_name": role_data.get("display_name"),
            "systems": role_data.get("systems"),
            "permissions": role_data.get("permissions"),
        }

        try:
            validate_role_policy_payload(role_key, payload)
        except ValueError as exc:
            errors.append(f"Role '{role_raw}': {exc}")

    return errors


def _validate_permission_references(permission_refs: set[str], is_valid_permission) -> list[str]:
    errors: list[str] = []
    for permission in sorted(permission_refs):
        if not is_valid_permission(permission):
            errors.append(
                "Permission reference "
                f"'{permission}' does not match expected format system:resource:action"
            )
    return errors


def main() -> int:
    (
        rbac_roles,
        is_valid_permission,
        normalize_role,
        validate_role_policy_payload,
    ) = _load_rbac_dependencies()

    seed_errors = _validate_seed_policies(
        rbac_roles,
        normalize_role,
        validate_role_policy_payload,
    )
    permission_refs = _collect_permissions_from_code(BACKEND_ROOT)
    permission_errors = _validate_permission_references(
        permission_refs,
        is_valid_permission,
    )

    errors = [*seed_errors, *permission_errors]
    if errors:
        print("RBAC policy lint failed:")
        for err in errors:
            print(f"- {err}")
        return 1

    print(
        "RBAC policy lint passed "
        f"({len(rbac_roles)} roles, {len(permission_refs)} permission references)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
