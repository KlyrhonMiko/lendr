from sqlmodel import Session
from core.base_service import BaseService
from systems.inventory.models.requested_item import RequestedItem
from systems.inventory.schemas.requested_item_schemas import (
    RequestedItemCreate,
    RequestedItemUpdate,
)
from systems.admin.services.configuration_service import ConfigurationService
from systems.admin.services.user_service import UserService
from utils.id_generator import get_next_sequence

class RequestedItemService(BaseService[RequestedItem, RequestedItemCreate, RequestedItemUpdate]):
    def __init__(self):
        super().__init__(RequestedItem, lookup_field="request_ref")
        self.user_service = UserService()
        self.config_service = ConfigurationService()

    def create_request(self, session: Session, schema: RequestedItemCreate) -> RequestedItem:
        # Check if user exists
        user = self.user_service.get(session, schema.requested_by)
        if not user:
            raise ValueError(f"User {schema.requested_by} not found")

        # Generate custom request_ref (REQ-XXXXXX)
        data = schema.model_dump()
        data["request_ref"] = get_next_sequence(session, self.model, "request_ref", "REQ")
        data["requested_by_uuid"] = user.id

        self.config_service.require_key(
            session,
            key="pending",
            category=self.config_service.category_for("requested_items", "status"),
            field_label="requested item status",
        )

        db_obj = self.model(**data)
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)
        return db_obj

    def update(
        self,
        session: Session,
        db_obj: RequestedItem,
        schema: RequestedItemUpdate,
    ) -> RequestedItem:
        data = schema.model_dump(exclude_unset=True)
        if data.get("status") is not None:
            self.config_service.require_key(
                session,
                key=str(data["status"]),
                category=self.config_service.category_for("requested_items", "status"),
                field_label="requested item status",
            )

        return super().update(session, db_obj, schema)
