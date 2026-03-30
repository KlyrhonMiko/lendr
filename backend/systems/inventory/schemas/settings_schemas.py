from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class SpecificRecipient(BaseModel):
    name: str = Field(..., max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)

class AlertSettingsBase(BaseModel):
    low_stock_threshold: int = Field(default=20, ge=0, le=100)
    overstock_threshold: int = Field(default=150, ge=100)
    expiry_threshold: int = Field(default=15, ge=0, le=100)
    borrow_request_alert_duration: int = Field(default=60, ge=1)
    borrow_request_alert_unit: str = Field(default="minutes")
    notification_channels: List[str] = Field(default_factory=lambda: ["in-app", "email", "sms"])
    alert_recipient_roles: List[str] = Field(default_factory=lambda: ["inventory_manager", "admin"])
    specific_recipients: List[SpecificRecipient] = Field(default_factory=list)

    @field_validator("specific_recipients")
    @classmethod
    def validate_unique_recipients(cls, v: List[SpecificRecipient]) -> List[SpecificRecipient]:
        emails = set()
        phones = set()
        for rec in v:
            if rec.email:
                email_lower = rec.email.lower()
                if email_lower in emails:
                    raise ValueError(f"Duplicate email found: {rec.email}")
                emails.add(email_lower)
            if rec.phone:
                if rec.phone in phones:
                    raise ValueError(f"Duplicate phone number found: {rec.phone}")
                phones.add(rec.phone)
        return v

class AlertSettingsRead(AlertSettingsBase):
    pass

class AlertSettingsUpdate(AlertSettingsBase):
    pass
