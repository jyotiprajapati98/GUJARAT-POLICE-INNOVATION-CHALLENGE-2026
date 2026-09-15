import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class SessionStatus(str, enum.Enum):
    starting = "starting"
    active = "active"
    ended = "ended"
    error = "error"

class StreamSession(Base):
    __tablename__ = "stream_sessions"
    __table_args__ = {"schema": "streaming"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stream_id = Column(UUID(as_uuid=True), ForeignKey("streaming.streams.id", ondelete="CASCADE"), nullable=False)

    user_id = Column(UUID(as_uuid=True), nullable=True)
    user_email = Column(String(200), nullable=True)
    quality = Column(String(10), default="sub")  # main or sub

    ffmpeg_pid = Column(Integer, nullable=True)
    hls_dir = Column(String(500), nullable=True)
    playlist_path = Column(String(500), nullable=True)  # relative: {session_id}/stream.m3u8

    status = Column(Enum(SessionStatus), default=SessionStatus.starting)
    error_message = Column(Text, nullable=True)

    started_at = Column(DateTime, default=datetime.utcnow)
    last_heartbeat_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    stream = relationship("Stream", back_populates="sessions")
