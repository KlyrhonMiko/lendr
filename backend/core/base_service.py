from typing import Any, Generic, Iterable, Type, TypeVar

from fastapi import HTTPException
from sqlmodel import Session, and_, col, select, func

from core.base_model import BaseModel
from core.base_model import ConfigurationBase
from utils.time_utils import get_now_manila
from utils.id_generator import get_next_sequence

ModelType = TypeVar("ModelType", bound=BaseModel)
ConfigModelType = TypeVar("ConfigModelType", bound=ConfigurationBase)
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")


class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType], lookup_field: str = "id"):
        self.model = model
        self.lookup_field = lookup_field

    def get(self, session: Session, lookup_val: Any, include_deleted: bool = False) -> ModelType | None:
        
        statement = select(self.model).where(
            getattr(self.model, self.lookup_field) == lookup_val
        )
        if not include_deleted:
            statement = statement.where(self.model.is_deleted.is_(False))
            
        return session.exec(statement).first()


    def get_all(
        self, session: Session, skip: int = 0, limit: int = 100
    ) -> tuple[list[ModelType], int]:
        """Get all non-deleted records with pagination and total count."""

        items_statement = (
            select(self.model)
            .where(self.model.is_deleted.is_(False))
            .offset(skip)
            .limit(limit)
        )
        total_statement = select(func.count(self.model.id)).where(
            self.model.is_deleted.is_(False)
        )

        items = session.exec(items_statement).all()
        total_count = session.exec(total_statement).one()

        return items, total_count

    def create(
        self, session: Session, schema: CreateSchemaType, prefix: str | None = None
    ) -> ModelType:
        """Create a new record from a schema, optionally generating a formatted ID."""
        data = schema.model_dump()

        # If a prefix is provided and the lookup_field is empty, generate it
        if prefix and not data.get(self.lookup_field):
            

            data[self.lookup_field] = get_next_sequence(
                session, self.model, self.lookup_field, prefix
            )

        db_obj = self.model(**data)
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)

        return db_obj

    def update(
        self, session: Session, db_obj: ModelType, schema: UpdateSchemaType
    ) -> ModelType:
        obj_data = schema.model_dump(exclude_unset=True)

        for key, value in obj_data.items():
            setattr(db_obj, key, value)

        db_obj.updated_at = get_now_manila()
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)

        return db_obj

    def delete(self, session: Session, db_obj: ModelType) -> ModelType:
        db_obj.is_deleted = True
        db_obj.deleted_at = get_now_manila()
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)

        return db_obj

    def restore(self, session: Session, db_obj: ModelType) -> ModelType:
        db_obj.is_deleted = False
        db_obj.deleted_at = None
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)

        return db_obj

    def validate_uniqueness(
        self, 
        session: Session, 
        schema: CreateSchemaType | UpdateSchemaType, 
        unique_fields: list[list[str]],
        extra_filters: Iterable[Any] = None
    ):
        """
        Validates that the given sets of fields are unique among active records.
        """
        data = schema.model_dump()
        
        for field_set in unique_fields:
            conditions = []

            for field in field_set:
                val = data.get(field)
                if val is not None:
                    conditions.append(getattr(self.model, field) == val)
            
            if not conditions:
                continue

            query = select(self.model).where(and_(*conditions)).where(self.model.is_deleted.is_(False))
            
            if extra_filters:
                for filter_cond in extra_filters:
                    query = query.where(filter_cond)

            existing = session.exec(query).first()

            if existing:
                field_names = " and ".join(field_set)
                raise HTTPException(
                    status_code=400, 
                    detail=f"A record with this {field_names} already exists."
                )


class ConfigBaseService(Generic[ConfigModelType]):
    def __init__(self, model: Type[ConfigModelType]):
        self.model = model

    def get_by_key(
        self,
        session: Session,
        key: str,
        category: str | None = None,
    ) -> ConfigModelType | None:
        statement = select(self.model).where(
            self.model.key == key,
            self.model.is_deleted.is_(False),
        )

        if category is not None:
            statement = statement.where(self.model.category == category)
        results = list(session.exec(statement).all())

        if not results:
            return None
        if category is None and len(results) > 1:
            raise ValueError(
                f"Multiple settings found for key '{key}'. Provide category to disambiguate."
            )

        return results[0]

    def exists(self, session: Session, key: str, category: str) -> bool:
        statement = select(self.model).where(
            self.model.key == key,
            self.model.category == category,
            self.model.is_deleted.is_(False),
        )
        return session.exec(statement).first() is not None

    def get_by_category(self, session: Session, category: str) -> list[ConfigModelType]:
        statement = select(self.model).where(
            self.model.category == category,
            self.model.is_deleted.is_(False),
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
            new_setting = self.model(
                key=key,
                value=str(value),
                category=category,
                description=description,
            )
            session.add(new_setting)

        session.commit()

    def require_key(
        self,
        session: Session,
        key: str,
        category: str,
        field_label: str = "configuration value",
    ) -> ConfigModelType:
        setting = self.get_by_key(session, key, category=category)
        if not setting:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid {field_label}: '{key}'. Missing configuration setting ({category}, {key}).",
            )
        return setting

    def category_for(self, table_name: str, field_name: str) -> str:
        return f"{table_name}_{field_name}"

    def require_table_field_key(
        self,
        session: Session,
        key: str,
        table_name: str,
        field_name: str,
        field_label: str = "configuration value",
    ) -> ConfigModelType:
        category = self.category_for(table_name, field_name)
        return self.require_key(
            session,
            key=key,
            category=category,
            field_label=field_label,
        )

    def get_all(
        self,
        session: Session,
        skip: int = 0,
        limit: int = 100,
        key: str | None = None,
        category: str | None = None,
    ) -> tuple[list[ConfigModelType], int]:

        statement = select(self.model).where(self.model.is_deleted.is_(False))
        if key:
            statement = statement.where(self.model.key.ilike(f"%{key}%"))
        if category:
            statement = statement.where(self.model.category == category)
        total_statement = select(func.count()).select_from(statement.subquery())

        total = session.exec(total_statement).one()
        statement = statement.offset(skip).limit(limit)
        results = list(session.exec(statement).all())

        return results, total

    def get_categories(self, session: Session) -> list[str]:
        statement = select(self.model.category).where(
            self.model.is_deleted.is_(False)
        ).distinct()

        return sorted(list(session.exec(statement).all()))

    def delete(self, session: Session, db_obj: ConfigModelType) -> ConfigModelType:
        db_obj.is_deleted = True
        db_obj.deleted_at = get_now_manila()
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)

        return db_obj

    def restore(self, session: Session, db_obj: ConfigModelType) -> ConfigModelType:
        db_obj.is_deleted = False
        db_obj.deleted_at = None
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)

        return db_obj