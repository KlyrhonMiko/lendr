import re
import random
import string

from sqlmodel import Field, SQLModel

from core.base_model import BaseModel


def _generate_user_id(prefix: str = "USER") -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}-{suffix}"


class User(BaseModel, table=True):
    __tablename__ = "users"

    user_id: str = Field(
        default_factory=_generate_user_id,
        unique=True,
        index=True,
        max_length=20,
    )
    last_name: str = Field(max_length=100)
    first_name: str = Field(max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    username: str = Field(unique=True, index=True, max_length=50)
    email: str = Field(unique=True, index=True, max_length=255)
    hashed_password: str = Field(max_length=255)
    role: str = Field(max_length=50)
