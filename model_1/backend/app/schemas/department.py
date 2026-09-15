from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
import uuid


class DepartmentCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    head_name: Optional[str] = None
    address: Optional[str] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    head_name: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    code: str
    description: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    head_name: Optional[str] = None
    address: Optional[str] = None
    is_active: bool
    camera_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime
