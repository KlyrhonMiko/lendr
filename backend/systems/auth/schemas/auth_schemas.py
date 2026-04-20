from datetime import datetime

from pydantic import BaseModel, Field, field_serializer


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


class RolePolicyRead(BaseModel):
    role: str = Field(..., max_length=100)
    display_name: str = Field(..., max_length=100)
    systems: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)


class SessionPolicyRead(BaseModel):
    inactive_minutes: int = Field(..., ge=0)
    warning_minutes: int = Field(..., ge=0)


class FirstLoginPasswordRotateRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=255)
    current_password: str = Field(..., min_length=6, max_length=255)
    new_password: str = Field(..., min_length=6, max_length=255)


class ForcedPasswordChangeRequiredRead(BaseModel):
    auth_state: str = Field(default="password_change_required")
    code: str = Field(default="AUTH.FIRST_LOGIN_PASSWORD_CHANGE_REQUIRED")
    detail: str = Field(default="Password rotation is required before completing login.")
    password_change_required: bool = True
    rotation_endpoint: str = Field(default="/api/auth/first-login/rotate-password")


class TwoFactorEnrollmentInitiateRead(BaseModel):
    method: str = Field(default="authenticator_app")
    secret: str
    provisioning_uri: str


class TwoFactorCodeVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=12)


class TwoFactorDisableRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=12)


class TwoFactorStatusRead(BaseModel):
    enabled: bool
    method: str = Field(default="authenticator_app")
    enrolled_at: datetime | None = None

    @field_serializer("enrolled_at")
    def serialize_enrolled_at(self, value: datetime | None) -> str | None:
        if not value:
            return None
        return value.isoformat()


class TwoFactorChallengeRead(BaseModel):
    two_factor_required: bool = True
    challenge_token: str
    challenge_expires_at: datetime
    method: str = Field(default="authenticator_app")

    @field_serializer("challenge_expires_at")
    def serialize_challenge_expiry(self, value: datetime) -> str:
        return value.isoformat()


class TwoFactorChallengeVerifyRequest(BaseModel):
    challenge_token: str = Field(..., min_length=16, max_length=128)
    code: str = Field(..., min_length=6, max_length=12)
