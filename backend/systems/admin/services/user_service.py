from sqlmodel import Session

from core.base_service import BaseService
from systems.admin.models.user import User
from systems.admin.schemas.user_schemas import UserCreate, UserUpdate
from utils.id_generator import get_next_sequence
from utils.security import get_password_hash
from utils.time_utils import get_now_manila
from systems.admin.services.configuration_service import ConfigurationService

class UserService(BaseService[User, UserCreate, UserUpdate]):
    def __init__(self):
        super().__init__(User, lookup_field="user_id")
        self.config_service = ConfigurationService() # <-- Initialize here
    def create(self, session: Session, schema: UserCreate) -> User:
        self.validate_uniqueness(
            session,
            schema,
            unique_fields=[["email"], ["username"]],
        )

        setting = self.config_service.get_by_key(
            session, 
            key=schema.role.lower(), 
            category="user_role_prefix"
        )
        
        if not setting:
             raise ValueError(
                f"Configuration Error: ID prefix for role '{schema.role}' is not defined. "
                f"Please add it to system_settings under category 'user_role_prefix'."
            )

        prefix = setting.value

        data = schema.model_dump()
        password = data.pop("password")
        data["hashed_password"] = get_password_hash(password)

        if not data.get(self.lookup_field):
            data[self.lookup_field] = get_next_sequence(session, self.model, self.lookup_field, prefix)

        db_obj = self.model(**data)
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)
        return db_obj

    def update(self, session: Session, db_obj: User, schema: UserUpdate) -> User:
        obj_data = schema.model_dump(exclude_unset=True)
        if "password" in obj_data:
            password = obj_data.pop("password")
            obj_data["hashed_password"] = get_password_hash(password)

        for key, value in obj_data.items():
            setattr(db_obj, key, value)

        db_obj.updated_at = get_now_manila()
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)
        return db_obj