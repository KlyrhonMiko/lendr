from sqlalchemy import inspect

from core.base_service import ConfigBaseService
from core.database import engine
from systems.admin.models.settings import AdminConfig


class ConfigurationService(ConfigBaseService[AdminConfig]):
    def __init__(self):
        super().__init__(AdminConfig)

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