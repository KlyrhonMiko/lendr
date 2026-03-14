from sqlmodel import Field
from core.base_model import BaseModel

class RequestedItem(BaseModel, table=True):
    __tablename__ = "requested_items"

    request_ref: str = Field(unique=True, index=True, max_length=50)
    requested_by: str = Field(foreign_key="users.user_id", index=True, max_length=50)
    item_name: str = Field(max_length=255)
    qty: int = Field(default=1)
    justification: str | None = Field(default=None, max_length=500)
    status: str = Field(default="pending", max_length=50) # pending, procurement, cancelled, fulfilled

    borrow_id: str | None = Field(default=None, foreign_key="borrow_requests.borrow_id", index=True, max_length=50)