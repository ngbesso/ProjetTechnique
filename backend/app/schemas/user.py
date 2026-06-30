from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    is_active: bool
    created_at: datetime
    roles: list[str] = []
    permissions: list[str] = []


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SetPasswordRequest(BaseModel):
    token: str
    password: str


class RoleAssignmentRead(BaseModel):
    role: str
    role_id: int
    church_id: int
    church_name: str


class UserAdminRead(BaseModel):
    id: int
    email: str
    is_active: bool
    created_at: datetime
    assignments: list[RoleAssignmentRead]


class UserActiveUpdate(BaseModel):
    is_active: bool


class RoleAssignmentInput(BaseModel):
    user_id: int
    role_id: int
    church_id: int
