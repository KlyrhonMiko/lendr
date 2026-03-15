from uuid import UUID

from sqlmodel import Field, Relationship
from core.base_model import BaseModel

class BorrowParticipant(BaseModel, table=True):
    __tablename__ = "borrow_participants"

    borrow_uuid: UUID | None = Field(default=None, foreign_key="borrow_requests.id", index=True)
    user_uuid: UUID | None = Field(default=None, foreign_key="users.id", index=True)
    name: str | None = Field(default=None, max_length=100)  # For non-registered participants
    role_in_request: str = Field(default="witness", max_length=50)  # companion, witness, etc.

    borrow_request: "BorrowRequest" = Relationship(
        back_populates="participants",
        sa_relationship_kwargs={"foreign_keys": "[BorrowParticipant.borrow_uuid]"},
    )
