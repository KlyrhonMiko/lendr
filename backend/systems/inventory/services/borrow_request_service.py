from sqlmodel import Session
from core.base_service import BaseService
from systems.inventory.models.borrow_request import BorrowRequest
from systems.inventory.schemas.borrow_request_schemas import BorrowRequestCreate, BorrowRequestUpdate

class BorrowService(BaseService[BorrowRequest, BorrowRequestCreate, BorrowRequestUpdate]):
    def __init__(self):
        super().__init__(BorrowRequest, lookup_field="borrow_id")

    def create(self, session: Session, schema: BorrowRequestCreate) -> BorrowRequest:
        self.validate_uniqueness(
            session,
            schema,
            unique_fields=[["borrower_id", "item_id"]],
            extra_filters=[BorrowRequest.status.in_(["pending", "approved", "released"])]
        )

        return super().create(session, schema, prefix="BRW")


