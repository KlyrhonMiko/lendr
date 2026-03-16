from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    middle_name: Optional[str] = Field(default=None, max_length=100)

    email: Optional[EmailStr] = Field(default=None, max_length=255)
    contact_number: Optional[str] = Field(default=None, max_length=20)

    username: Optional[str] = Field(default=None, max_length=50)
    role: Optional[str] = Field(default=None, max_length=50)
    employee_id: Optional[str] = Field(default=None, max_length=50)
    shift_type: str = Field(default="day", max_length=20)


class UserCreate(UserBase):
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)

    email: EmailStr = Field(..., max_length=255)

    username: str = Field(..., max_length=50)
    password: str = Field(..., min_length=6, max_length=255)
    
    role: str = Field(..., max_length=50)


class UserUpdate(UserBase):
    password: Optional[str] = Field(default=None, min_length=6, max_length=255)


class UserRead(UserBase):
    user_id: str

    class Config:
        from_attributes = True