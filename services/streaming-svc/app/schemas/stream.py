import re
import uuid
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.stream import HealthStatus

class StreamCreate(BaseModel):
    camera_id: Optional[uuid.UUID] = None
    camera_id_label: Optional[str] = None
    department_id: Optional[uuid.UUID] = None
    department_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    rtsp_url: str  # stored as-is
    main_stream_suffix: Optional[str] = None
    sub_stream_suffix: Optional[str] = None

class StreamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rtsp_url: Optional[str] = None
    main_stream_suffix: Optional[str] = None
    sub_stream_suffix: Optional[str] = None
    is_active: Optional[bool] = None

class StreamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    camera_id: Optional[uuid.UUID] = None
    camera_id_label: Optional[str] = None
    department_id: Optional[uuid.UUID] = None
    department_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    rtsp_url_masked: Optional[str] = None  # computed — hide credentials
    main_stream_suffix: Optional[str] = None
    sub_stream_suffix: Optional[str] = None
    health_status: HealthStatus
    last_health_check_at: Optional[datetime] = None
    last_online_at: Optional[datetime] = None
    last_error: Optional[str] = None
    consecutive_failures: int
    is_active: bool
    created_by_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm_masked(cls, stream):
        """Build response with masked RTSP URL"""
        obj = cls.model_validate(stream)
        # mask credentials: rtsp://user:pass@host → rtsp://****@host
        masked = re.sub(r'(rtsp://)[^@]+@', r'\1****@', stream.rtsp_url or '')
        obj.rtsp_url_masked = masked
        return obj

class StreamHealthResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    camera_id_label: Optional[str] = None
    department_name: Optional[str] = None
    health_status: HealthStatus
    last_health_check_at: Optional[datetime] = None
    last_online_at: Optional[datetime] = None
    consecutive_failures: int
    is_active: bool
