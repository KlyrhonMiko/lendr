from pydantic import BaseModel, Field


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


class BootstrapPasswordRotateRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=255)
    current_password: str = Field(..., min_length=6, max_length=255)
    new_password: str = Field(..., min_length=8, max_length=255)