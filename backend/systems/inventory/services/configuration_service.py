from sqlmodel import Session, select

from core.base_service import BaseService
from systems.inventory.models.configuration import SystemSetting


class ConfigurationService(BaseService[SystemSetting, None, None]):
    def __init__(self):
        super().__init__(SystemSetting)

    def get_by_key(self, session: Session, key: str) -> SystemSetting | None:
        statement = select(SystemSetting).where(SystemSetting.key == key)
        return session.exec(statement).first()

    def get_by_category(self, session: Session, category: str) -> list[SystemSetting]:
        statement = select(SystemSetting).where(
            SystemSetting.category == category,
            SystemSetting.is_deleted.is_(False)
        )
        return list(session.exec(statement).all())

    def get_value(self, session: Session, key: str, default: str) -> str:
        setting = self.get_by_key(session, key)
        return setting.value if setting else default

    def set_value(self, session: Session, key: str, value: str, category: str = "general", description: str | None = None):
        setting = self.get_by_key(session, key)
        
        if setting:
            setting.value = str(value)
            if description:
                setting.description = description
            session.add(setting)
        else:
            new_setting = SystemSetting(key=key, value=str(value), category=category, description=description)
            session.add(new_setting)
        
        session.commit()

