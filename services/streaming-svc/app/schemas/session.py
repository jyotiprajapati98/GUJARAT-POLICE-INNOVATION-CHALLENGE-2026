import uuid
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.session import SessionStatus

class SessionStartRequest(BaseModel):
    quality: str = "sub"  # main or sub

class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    stream_id: uuid.UUID
    user_email: Optional[str] = None
    quality: str
    status: SessionStatus
    playlist_url: Optional[str] = None  # computed: /hls/{session_id}/stream.m3u8
    ffmpeg_pid: Optional[int] = None
    started_at: datetime
    last_heartbeat_at: datetime
    ended_at: Optional[datetime] = None
    error_message: Optional[str] = None
