from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_serializer

class EntrustedItemBase(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=1000)

class EntrustedItemCreate(EntrustedItemBase):
    """Assign an inventory unit to a user."""
    unit_id: str = Field(description="The unit_id of the inventory unit to assign")
    user_id: str = Field(description="The user_id of the employee")

class EntrustedItemRevoke(BaseModel):
    """Revoke an entrusted item assignment."""
    notes: Optional[str] = Field(default=None, max_length=1000)

class EntrustedItemRead(EntrustedItemBase):
    model_config = ConfigDict(from_attributes=True)

    assignment_id: str
    
    # We expose the string handles instead of internal UUIDs
    unit_id: str
    serial_number: Optional[str] = None
    item_name: Optional[str] = None
    item_category: Optional[str] = None
    
    assigned_to_user_id: str
    assigned_to_name: Optional[str] = None
    assigned_by_user_id: Optional[str] = None
    assigned_at: datetime
    
    returned_by_user_id: Optional[str] = None
    returned_at: Optional[datetime] = None

    @field_serializer("assigned_at", "returned_at")
    def serialize_dates(self, dt: datetime | None) -> str | None:
        if dt is None:
            return None
        from utils.time_utils import DEFAULT_TZ
        from datetime import timezone
        
        # If naive, assume it's UTC (Postgres storage behavior for aware datetimes in naive columns)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
            
        # Convert to Manila time
        return dt.astimezone(DEFAULT_TZ).isoformat()
