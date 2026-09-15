from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.ingestion_worker import WorkerStatus


class WorkerStartRequest(BaseModel):
    camera_id: Optional[UUID] = None   # auto-generated if omitted
    camera_id_label: Optional[str] = None
    rtsp_url: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None


class WorkerResponse(BaseModel):
    id: UUID
    camera_id: UUID
    camera_id_label: Optional[str] = None
    rtsp_url_masked: Optional[str] = None
    status: WorkerStatus
    last_heartbeat: Optional[datetime] = None
    started_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    error_message: Optional[str] = None
    frames_processed: int = 0
    detections_count: int = 0
    is_running: Optional[bool] = None

    model_config = {"from_attributes": True}
