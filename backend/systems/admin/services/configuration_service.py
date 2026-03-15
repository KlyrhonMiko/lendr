from sqlalchemy import inspect
from sqlmodel import Session, select

from core.base_service import BaseService
from core.database import engine
from systems.admin.models.configuration import SystemSetting


class ConfigurationService(BaseService[SystemSetting, None, None]):
    def __init__(self):
        super().__init__(SystemSetting)

    def get_by_key(
        self,
        session: Session,
        key: str,
        category: str | None = None,
    ) -> SystemSetting | None:
        statement = select(SystemSetting).where(
            SystemSetting.key == key,
            SystemSetting.is_deleted.is_(False),
        )

        if category is not None:
            statement = statement.where(SystemSetting.category == category)

        results = list(session.exec(statement).all())
        if not results:
            return None

        if category is None and len(results) > 1:
            raise ValueError(
                f"Multiple settings found for key '{key}'. Provide category to disambiguate."
            )

        return results[0]

    def get_by_category(self, session: Session, category: str) -> list[SystemSetting]:
        statement = select(SystemSetting).where(
            SystemSetting.category == category,
            SystemSetting.is_deleted.is_(False),
        )
        return list(session.exec(statement).all())

    def get_value(
        self,
        session: Session,
        key: str,
        default: str,
        category: str | None = None,
    ) -> str:
        setting = self.get_by_key(session, key, category=category)
        return setting.value if setting else default

    def set_value(
        self,
        session: Session,
        key: str,
        value: str,
        category: str = "general",
        description: str | None = None,
    ) -> None:
        setting = self.get_by_key(session, key, category=category)

        if setting:
            setting.value = str(value)
            if description:
                setting.description = description
            session.add(setting)
        else:
            new_setting = SystemSetting(
                key=key,
                value=str(value),
                category=category,
                description=description,
            )
            session.add(new_setting)

        session.commit()

    def exists(self, session: Session, key: str, category: str) -> bool:
        return self.get_by_key(session, key, category=category) is not None

    def require_key(
        self,
        session: Session,
        key: str,
        category: str,
        field_label: str = "configuration value",
    ) -> SystemSetting:
        setting = self.get_by_key(session, key, category=category)
        if not setting:
            raise ValueError(
                f"Invalid {field_label}: '{key}'. Missing system setting ({category}, {key})."
            )
        return setting

    @staticmethod
    def category_for(table_name: str, field_name: str) -> str:
        return f"{table_name}_{field_name}"

    def require_table_field_key(
        self,
        session: Session,
        key: str,
        table_name: str,
        field_name: str,
        field_label: str = "configuration value",
    ) -> SystemSetting:
        category = self.category_for(table_name, field_name)
        return self.require_key(
            session,
            key=key,
            category=category,
            field_label=field_label,
        )

    def list_tables(self) -> list[str]:
        inspector = inspect(engine)
        return sorted(inspector.get_table_names())

    def list_columns(self, table_name: str) -> list[str]:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        if table_name not in tables:
            raise ValueError(f"Table '{table_name}' does not exist")

        columns = inspector.get_columns(table_name)
        return sorted(str(col["name"]) for col in columns)

    def list_table_field_categories(self) -> list[str]:
        inspector = inspect(engine)
        categories: set[str] = set()
        for table_name in inspector.get_table_names():
            for col in inspector.get_columns(table_name):
                categories.add(self.category_for(table_name, str(col["name"])))
        return sorted(categories)

    def validate_category_exists(self, category: str) -> None:
        categories = self.list_table_field_categories()
        if category not in categories:
            raise ValueError(
                f"Invalid category '{category}'. Category must map to an existing table+column."
            )