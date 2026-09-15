from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
import uuid
from app.models.user import UserRole
from app.schemas.department import DepartmentResponse


class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: UserRole = UserRole.VIEWER
    department_id: Optional[uuid.UUID] = None


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    department_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    department_id: Optional[uuid.UUID] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserWithDept(UserResponse):
    department: Optional[DepartmentResponse] = None
