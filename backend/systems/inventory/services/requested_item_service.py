from sqlmodel import Session
from core.base_service import BaseService
from systems.inventory.models.requested_item import RequestedItem
from systems.inventory.schemas.requested_item_schemas import (
    RequestedItemCreate,
    RequestedItemUpdate,
)
from systems.inventory.services.user_service import UserService
from utils.id_generator import get_next_sequence

class RequestedItemService(BaseService[RequestedItem, RequestedItemCreate, RequestedItemUpdate]):
    def __init__(self):
        super().__init__(RequestedItem, lookup_field="request_ref")
        self.user_service = UserService()

    def create_request(self, session: Session, schema: RequestedItemCreate) -> RequestedItem:
        # Check if user exists
        user = self.user_service.get(session, schema.requested_by)
        if not user:
            raise ValueError(f"User {schema.requested_by} not found")

        # Generate custom request_ref (REQ-XXXXXX)
        data = schema.model_dump()
        data["request_ref"] = get_next_sequence(session, self.model, "request_ref", "REQ")

        db_obj = self.model(**data)
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)
        return db_obj
