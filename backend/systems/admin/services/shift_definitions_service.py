import json
from uuid import UUID

from fastapi import HTTPException
from sqlmodel import Session, select

from core.base_model import ConfigurationBase
from systems.admin.models.user import User
from systems.admin.schemas.security_settings import ShiftDefinition, ShiftDefinitionsSettings
from systems.admin.services.configuration_service import ConfigurationService
from systems.auth.services.configuration_service import AuthConfigService


SHIFT_DEFINITIONS_CATEGORY = "users_shift_definition"
SHIFT_TYPE_CATEGORY = "users_shift_type"


def _default_shift_definition(key: str, label: str | None = None) -> ShiftDefinition:
    if key == "day":
        start, end = "08:00", "17:00"
    elif key == "night":
        start, end = "17:00", "02:00"
    else:
        start, end = "08:00", "17:00"
    return ShiftDefinition(
        key=key,
        label=(label or key.replace("_", " ").title()).strip(),
        start=start,
        end=end,
        days=[1, 2, 3, 4, 5],
    )


class ShiftDefinitionsService:
    def __init__(
        self,
        admin_config_service: ConfigurationService,
        auth_config_service: AuthConfigService,
    ) -> None:
        self.admin_config_service = admin_config_service
        self.auth_config_service = auth_config_service

    def _get_compat_category_settings(self, session: Session, category: str):
        auth_settings = self.auth_config_service.get_by_category(session, category)
        admin_settings = self.admin_config_service.get_by_category(session, category)
        by_key: dict[str, ConfigurationBase] = {}
        for setting in admin_settings:
            by_key[str(setting.key).strip().lower()] = setting
        for setting in auth_settings:
            by_key[str(setting.key).strip().lower()] = setting
        return [by_key[key] for key in sorted(by_key.keys())]

    def _get_compat_setting_by_key(self, session: Session, key: str, category: str):
        return (
            self.auth_config_service.get_by_key(session, key, category=category),
            self.admin_config_service.get_by_key(session, key, category=category),
        )

    def _set_compat_value(
        self,
        session: Session,
        *,
        key: str,
        value: str,
        category: str,
        description: str,
        actor_id: UUID | None,
    ) -> None:
        auth_setting, admin_setting = self._get_compat_setting_by_key(session, key, category)
        self.auth_config_service.set_value(
            session,
            key=key,
            value=value,
            category=category,
            description=description,
            actor_id=actor_id,
        )
        if admin_setting:
            self.admin_config_service.set_value(
                session,
                key=key,
                value=value,
                category=category,
                description=description,
                actor_id=actor_id,
            )

    def _delete_compat_key(
        self,
        session: Session,
        *,
        key: str,
        category: str,
        actor_id: UUID | None,
    ) -> None:
        auth_setting, admin_setting = self._get_compat_setting_by_key(session, key, category)
        if auth_setting and not auth_setting.is_deleted:
            self.auth_config_service.delete(session, auth_setting, actor_id=actor_id)
        if admin_setting and not admin_setting.is_deleted:
            self.admin_config_service.delete(session, admin_setting, actor_id=actor_id)

    def build(self, session: Session) -> ShiftDefinitionsSettings:
        baseline: dict[str, str] = {
            str(setting.key).strip().lower(): str(setting.value).strip() or str(setting.key).strip().title()
            for setting in self._get_compat_category_settings(session, SHIFT_TYPE_CATEGORY)
            if str(setting.key).strip()
        }
        rich: dict[str, ShiftDefinition] = {}
        for setting in self._get_compat_category_settings(session, SHIFT_DEFINITIONS_CATEGORY):
            key = str(setting.key).strip().lower()
            if not key:
                continue
            try:
                parsed = json.loads(setting.value)
                rich[key] = ShiftDefinition.model_validate(
                    {
                        "key": key,
                        "label": parsed.get("label") or baseline.get(key) or key.title(),
                        "start": parsed.get("start") or "08:00",
                        "end": parsed.get("end") or "17:00",
                        "days": parsed.get("days") or [1, 2, 3, 4, 5],
                    }
                )
            except (TypeError, json.JSONDecodeError, ValueError):
                continue

        keys = list(baseline.keys())
        for key in rich.keys():
            if key not in keys:
                keys.append(key)

        definitions: list[ShiftDefinition] = []
        for key in keys:
            definition = rich.get(key) or _default_shift_definition(key, baseline.get(key))
            if key in baseline:
                definition = ShiftDefinition(
                    key=definition.key,
                    label=baseline[key],
                    start=definition.start,
                    end=definition.end,
                    days=definition.days,
                )
            definitions.append(definition)

        return ShiftDefinitionsSettings(
            source_category=SHIFT_TYPE_CATEGORY,
            values=keys,
            definitions=definitions,
        )

    def persist(
        self,
        session: Session,
        payload: ShiftDefinitionsSettings,
        actor_id: UUID | None,
    ) -> None:
        current = self.build(session)
        requested_keys = payload.values or [definition.key for definition in payload.definitions]
        if not requested_keys:
            raise HTTPException(status_code=400, detail="shift_definitions must include at least one value")

        current_map = {definition.key: definition for definition in current.definitions}
        request_map = {definition.key: definition for definition in payload.definitions}
        requested = [
            request_map.get(key)
            or current_map.get(key)
            or _default_shift_definition(key)
            for key in requested_keys
        ]

        removed = set(current.values) - {definition.key for definition in requested}
        if removed:
            assigned_shift_types = session.exec(
                select(User.shift_type).where(User.is_deleted.is_(False))
            ).all()
            if any(shift_type in removed for shift_type in assigned_shift_types):
                raise HTTPException(
                    status_code=409,
                    detail=f"Cannot remove shift definitions still assigned to users: {', '.join(sorted(removed))}",
                )
            for key in removed:
                self._delete_compat_key(session, key=key, category=SHIFT_TYPE_CATEGORY, actor_id=actor_id)
                self._delete_compat_key(
                    session,
                    key=key,
                    category=SHIFT_DEFINITIONS_CATEGORY,
                    actor_id=actor_id,
                )

        for definition in requested:
            self._set_compat_value(
                session,
                key=definition.key,
                value=definition.label,
                category=SHIFT_TYPE_CATEGORY,
                description="User-facing shift type labels for account assignment.",
                actor_id=actor_id,
            )
            self._set_compat_value(
                session,
                key=definition.key,
                value=json.dumps(
                    {
                        "label": definition.label,
                        "start": definition.start,
                        "end": definition.end,
                        "days": definition.days,
                    }
                ),
                category=SHIFT_DEFINITIONS_CATEGORY,
                description="Rich shift semantics used by the security settings page.",
                actor_id=actor_id,
            )
