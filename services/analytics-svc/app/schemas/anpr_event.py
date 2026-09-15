from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ANPREventCreate(BaseModel):
    camera_id: UUID
    camera_id_label: Optional[str] = None
    stream_id: Optional[UUID] = None
    plate_text: str
    confidence: float
    detect_confidence: Optional[float] = None
    detected_at: datetime
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    frame_path: Optional[str] = None


class ANPREventResponse(BaseModel):
    id: UUID
    camera_id: UUID
    camera_id_label: Optional[str] = None
    stream_id: Optional[UUID] = None
    plate_text: str
    confidence: float
    detect_confidence: Optional[float] = None
    detected_at: datetime
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    frame_path: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ANPRSearchParams(BaseModel):
    plate_text: Optional[str] = None
    camera_id: Optional[UUID] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    page: int = 1
    limit: int = 50
