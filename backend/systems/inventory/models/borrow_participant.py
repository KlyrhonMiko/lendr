from sqlmodel import Field, Relationship
from core.base_model import BaseModel

class BorrowParticipant(BaseModel, table=True):
    __tablename__ = "borrow_participants"

    borrow_id: str = Field(foreign_key="borrow_requests.borrow_id", index=True, max_length=50)
    user_id: str | None = Field(default=None, foreign_key="users.user_id", index=True, max_length=50)
    name: str | None = Field(default=None, max_length=100)  # For non-registered participants
    role_in_request: str = Field(default="witness", max_length=50)  # companion, witness, etc.

    borrow_request: "BorrowRequest" = Relationship(back_populates="participants")
