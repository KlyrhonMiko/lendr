from typing import Optional
from sqlmodel import Session, select, func, or_

from core.base_service import BaseService
from systems.admin.models.user import User
from systems.admin.schemas.user_schemas import UserCreate, UserUpdate
from utils.id_generator import get_next_sequence
from utils.security import get_password_hash
from utils.time_utils import get_now_manila

class UserService(BaseService[User, UserCreate, UserUpdate]):
    def __init__(self):
        super().__init__(User, lookup_field="user_id")

    def get_all(
        self,
        session: Session,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
        shift_type: Optional[str] = None,
    ) -> tuple[list[User], int]:
        """Get users with optional search and filter params."""
        statement = select(User)

        # Default: only show active users
        if is_active is None:
            statement = statement.where(User.is_deleted.is_(False))
        elif is_active:
            statement = statement.where(User.is_deleted.is_(False))
        else:
            statement = statement.where(User.is_deleted.is_(True))

        if search:
            statement = statement.where(
                or_(
                    User.user_id.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%"),
                    User.first_name.ilike(f"%{search}%"),
                    User.last_name.ilike(f"%{search}%"),
                )
            )
        if role is not None:
            statement = statement.where(User.role == role)
        if shift_type is not None:
            statement = statement.where(User.shift_type == shift_type)

        count_stmt = select(func.count()).select_from(statement.subquery())
        total = session.exec(count_stmt).one()

        results = session.exec(
            statement.order_by(User.last_name.asc(), User.first_name.asc()).offset(skip).limit(limit)
        ).all()

        return list(results), total

    def create(self, session: Session, schema: UserCreate) -> User:
        from systems.auth.services.configuration_service import AuthConfigService
        self.config_service = AuthConfigService()
        self.validate_uniqueness(
            session,
            schema,
            unique_fields=[["email"], ["username"]],
        )

        setting = self.config_service.get_by_key(
            session,
            key=schema.role.lower(),
            category="users_role"
        )

        if not setting:
             raise ValueError(
                f"Configuration Error: ID prefix for role '{schema.role}' is not defined. "
                f"Please add it to system_settings under category 'users_role'."
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