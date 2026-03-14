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