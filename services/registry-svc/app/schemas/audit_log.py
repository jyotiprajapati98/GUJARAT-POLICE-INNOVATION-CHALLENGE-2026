from __future__ import annotations
from typing import Optional, Any
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: Optional[UUID] = None
    user_email: Optional[str] = None
    department_id: Optional[UUID] = None
    department_name: Optional[str] = None

    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None

    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_method: Optional[str] = None
    request_path: Optional[str] = None

    details: Optional[Any] = None
    result: Optional[str] = None

    created_at: datetime
