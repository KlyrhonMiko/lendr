from typing import Any, Generic, Iterable, Type, TypeVar, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlmodel import Session, and_, select, func

from core.base_model import BaseModel
from core.base_model import ConfigurationBase
from utils.time_utils import get_now_manila
from utils.id_generator import get_next_sequence

ModelType = TypeVar("ModelType", bound=BaseModel)
ConfigModelType = TypeVar("ConfigModelType", bound=ConfigurationBase)
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")


class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Generic CRUD service.

    Transaction policy:
    - Services mutate session state and flush when needed for DB-generated values.
    - API/application boundaries own commit and rollback decisions.
    """

    def __init__(self, model: Type[ModelType], lookup_field: str = "id"):
        self.model = model
        self.lookup_field = lookup_field

    def get(
        self, session: Session, lookup_val: Any, include_deleted: bool = False, include_archived: bool = True
    ) -> ModelType | None:

        statement = select(self.model).where(
            getattr(self.model, self.lookup_field) == lookup_val
        )
        if not include_deleted:
            statement = statement.where(self.model.is_deleted.is_(False))
        if not include_archived:
            statement = statement.where(self.model.is_archived.is_(False))

        return session.exec(statement).first()

    def get_all(
        self, 
        session: Session, 
        skip: int = 0, 
        limit: int = 100, 
        include_archived: bool = False,
        is_archived: Optional[bool] = None
    ) -> tuple[list[ModelType], int]:
        """Get all non-deleted records with pagination and flexible archival filtering."""

        # Build base query for items
        items_statement = select(self.model).where(self.model.is_deleted.is_(False))
        
        # Build base query for total count
        total_statement = select(func.count(self.model.id)).where(self.model.is_deleted.is_(False))

        # Apply archival filtering
        if is_archived is not None:
            # Explicitly filter for archived (True) or active (False)
            items_statement = items_statement.where(self.model.is_archived == is_archived)
            total_statement = total_statement.where(self.model.is_archived == is_archived)
        elif not include_archived:
            # Default behavior (if not specified): hide archived items
            items_statement = items_statement.where(self.model.is_archived.is_(False))
            total_statement = total_statement.where(self.model.is_archived.is_(False))

        # Execute queries
        items = session.exec(items_statement.offset(skip).limit(limit)).all()
        total_count = session.exec(total_statement).one()

        return items, total_count

    def _log_audit(
        self,
        session: Session,
        action: str,
        entity_id: str,
        before: dict | None = None,
        after: dict | None = None,
        actor_id: Optional[UUID] = None,
        reason_code: Optional[str] = None,
    ):
        """Helper to log actions to the audit trial."""
        from core.models.audit_log import AuditLog
        
        # Prevent infinite recursion if we are auditing the AuditLog table itself
        if self.model == AuditLog:
            return

        audit_id = get_next_sequence(session, AuditLog, "audit_id", "AUDIT")
        log_entry = AuditLog(
            audit_id=audit_id,
            entity_type=self.model.__tablename__,
            entity_id=entity_id,
            action=action,
            reason_code=reason_code,
            actor_id=actor_id,
            before_json=before,
            after_json=after,
        )
        session.add(log_entry)

    def create(
        self, 
        session: Session, 
        schema: CreateSchemaType, 
        prefix: str | None = None,
        actor_id: Optional[UUID] = None,
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
        
        # Log the creation
        self._log_audit(
            session=session,
            action="created",
            entity_id=getattr(db_obj, self.lookup_field),
            after=db_obj.model_dump(mode="json"),
            actor_id=actor_id,
        )

        session.flush()
        session.refresh(db_obj)

        return db_obj

    def update(
        self, 
        session: Session, 
        db_obj: ModelType, 
        schema: UpdateSchemaType,
        actor_id: Optional[UUID] = None,
    ) -> ModelType:
        before = db_obj.model_dump(mode="json")
        obj_data = schema.model_dump(exclude_unset=True)

        for key, value in obj_data.items():
            setattr(db_obj, key, value)

        db_obj.updated_at = get_now_manila()
        session.add(db_obj)

        # Log the update
        self._log_audit(
            session=session,
            action="updated",
            entity_id=getattr(db_obj, self.lookup_field),
            before=before,
            after=db_obj.model_dump(mode="json"),
            actor_id=actor_id,
        )

        session.flush()
        session.refresh(db_obj)

        return db_obj

    def delete(
        self, 
        session: Session, 
        db_obj: ModelType,
        actor_id: Optional[UUID] = None,
    ) -> ModelType:
        before = db_obj.model_dump(mode="json")
        db_obj.is_deleted = True
        db_obj.deleted_at = get_now_manila()
        session.add(db_obj)

        # Log the deletion
        self._log_audit(
            session=session,
            action="deleted",
            entity_id=getattr(db_obj, self.lookup_field),
            before=before,
            after=db_obj.model_dump(mode="json"),
            actor_id=actor_id,
        )

        session.flush()
        session.refresh(db_obj)

        return db_obj

    def restore(
        self, 
        session: Session, 
        db_obj: ModelType,
        actor_id: Optional[UUID] = None,
    ) -> ModelType:
        before = db_obj.model_dump(mode="json")
        db_obj.is_deleted = False
        db_obj.deleted_at = None
        session.add(db_obj)

        # Log the restoration
        self._log_audit(
            session=session,
            action="restored",
            entity_id=getattr(db_obj, self.lookup_field),
            before=before,
            after=db_obj.model_dump(mode="json"),
            actor_id=actor_id,
        )

        session.flush()
        session.refresh(db_obj)

        return db_obj

    def archive(
        self, 
        session: Session, 
        db_obj: ModelType,
        actor_id: Optional[UUID] = None,
    ) -> ModelType:
        before = db_obj.model_dump(mode="json")
        db_obj.is_archived = True
        db_obj.archived_at = get_now_manila()
        session.add(db_obj)

        # Log archival
        self._log_audit(
            session=session,
            action="archived",
            entity_id=getattr(db_obj, self.lookup_field),
            before=before,
            after=db_obj.model_dump(mode="json"),
            actor_id=actor_id,
        )

        session.flush()
        session.refresh(db_obj)

        return db_obj

    def restore_archive(
        self, 
        session: Session, 
        db_obj: ModelType,
        actor_id: Optional[UUID] = None,
    ) -> ModelType:
        before = db_obj.model_dump(mode="json")
        db_obj.is_archived = False
        db_obj.archived_at = None
        session.add(db_obj)

        # Log restoration
        self._log_audit(
            session=session,
            action="unarchived",
            entity_id=getattr(db_obj, self.lookup_field),
            before=before,
            after=db_obj.model_dump(mode="json"),
            actor_id=actor_id,
        )

        session.flush()
        session.refresh(db_obj)

        return db_obj

    def hard_delete(
        self, 
        session: Session, 
        db_obj: ModelType,
        actor_id: Optional[UUID] = None,
    ) -> None:
        """Permanently remove a record from the database."""
        before = db_obj.model_dump(mode="json")
        entity_id = getattr(db_obj, self.lookup_field)
        
        session.delete(db_obj)

        # Log the permanent purge
        self._log_audit(
            session=session,
            action="purged",
            entity_id=entity_id,
            before=before,
            after=None,
            actor_id=actor_id,
        )

        session.flush()

    def validate_uniqueness(
        self,
        session: Session,
        schema: CreateSchemaType | UpdateSchemaType,
        unique_fields: list[list[str]],
        extra_filters: Iterable[Any] = None,
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

            query = (
                select(self.model)
                .where(and_(*conditions))
                .where(self.model.is_deleted.is_(False))
            )

            if extra_filters:
                for filter_cond in extra_filters:
                    query = query.where(filter_cond)

            existing = session.exec(query).first()

            if existing:
                field_names = " and ".join(field_set)
                raise HTTPException(
                    status_code=400,
                    detail=f"A record with this {field_names} already exists.",
                )


class ConfigBaseService(Generic[ConfigModelType]):
    def __init__(self, model: Type[ConfigModelType]):
        self.model = model

    def _log_audit(
        self,
        session: Session,
        action: str,
        entity_id: str,
        before: dict | None = None,
        after: dict | None = None,
        actor_id: Optional[UUID] = None,
    ):
        """Helper to log configuration actions to the audit trial."""
        from core.models.audit_log import AuditLog
        
        audit_id = get_next_sequence(session, AuditLog, "audit_id", "AUDIT")
        log_entry = AuditLog(
            audit_id=audit_id,
            entity_type=getattr(self.model, "__tablename__", "configuration"),
            entity_id=entity_id,
            action=action,
            actor_id=actor_id,
            before_json=before,
            after_json=after,
        )
        session.add(log_entry)

    def get_by_key(
        self,
        session: Session,
        key: str,
        category: str | None = None,
    ) -> ConfigModelType | None:
        statement = select(self.model).where(
            (func.lower(self.model.key) == key.lower()) | (func.lower(self.model.value) == key.lower()),
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
            (func.lower(self.model.key) == key.lower()) | (func.lower(self.model.value) == key.lower()),
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
        crucial: bool | None = None,
        actor_id: Optional[UUID] = None,
    ) -> None:
        setting = self.get_by_key(session, key, category=category)
        entity_id = f"{category}:{key}"

        if setting:
            before = setting.model_dump(mode="json")
            setting.value = str(value)
            if description:
                setting.description = description
            if crucial:
                setting.crucial = True
            session.add(setting)
            after = setting.model_dump(mode="json")
            self._log_audit(session, "updated", entity_id, before, after, actor_id)
        else:
            new_setting = self.model(
                key=key,
                value=str(value),
                category=category,
                description=description,
                crucial=bool(crucial),
            )
            session.add(new_setting)
            after = new_setting.model_dump(mode="json")
            self._log_audit(session, "created", entity_id, None, after, actor_id)

        session.flush()

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
        system: str | None = None,
    ) -> tuple[list[ConfigModelType], int]:

        statement = select(self.model).where(self.model.is_deleted.is_(False))
        if key:
            statement = statement.where(self.model.key.ilike(f"%{key}%"))
        if category:
            statement = statement.where(self.model.category == category)
        if system:
            statement = statement.where(self.model.system == system)
        total_statement = select(func.count()).select_from(statement.subquery())

        total = session.exec(total_statement).one()
        statement = statement.offset(skip).limit(limit)
        results = list(session.exec(statement).all())

        return results, total

    def get_categories(self, session: Session) -> list[str]:
        statement = (
            select(self.model.category)
            .where(self.model.is_deleted.is_(False))
            .distinct()
        )

        return sorted(list(session.exec(statement).all()))

    def get_systems(self, session: Session) -> list[str]:
        statement = (
            select(self.model.system)
            .where(self.model.is_deleted.is_(False))
            .distinct()
        )

        return sorted(list(session.exec(statement).all()))

    def delete(
        self, session: Session, db_obj: ConfigModelType, actor_id: Optional[UUID] = None
    ) -> ConfigModelType:
        if db_obj.crucial:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Setting '{db_obj.key}' in category '{db_obj.category}' is crucial "
                    "and cannot be deleted."
                ),
            )

        before = db_obj.model_dump(mode="json")
        db_obj.is_deleted = True
        db_obj.deleted_at = get_now_manila()
        session.add(db_obj)
        after = db_obj.model_dump(mode="json")
        entity_id = f"{db_obj.category}:{db_obj.key}"
        self._log_audit(session, "deleted", entity_id, before, after, actor_id)
        session.flush()
        session.refresh(db_obj)

        return db_obj

    def restore(
        self, session: Session, db_obj: ConfigModelType, actor_id: Optional[UUID] = None
    ) -> ConfigModelType:
        before = db_obj.model_dump(mode="json")
        db_obj.is_deleted = False
        db_obj.deleted_at = None
        session.add(db_obj)
        after = db_obj.model_dump(mode="json")
        entity_id = f"{db_obj.category}:{db_obj.key}"
        self._log_audit(session, "restored", entity_id, before, after, actor_id)
        session.flush()
        session.refresh(db_obj)

        return db_obj
