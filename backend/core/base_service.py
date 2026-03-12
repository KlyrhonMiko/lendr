from typing import Any, Generic, Type, TypeVar, Iterable
from sqlmodel import Session, select, and_, col
from fastapi import HTTPException
from core.base_model import BaseModel
from utils.time_utils import get_now_manila

ModelType = TypeVar("ModelType", bound=BaseModel)
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
        from sqlmodel import func

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
            from utils.id_generator import get_next_sequence

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
