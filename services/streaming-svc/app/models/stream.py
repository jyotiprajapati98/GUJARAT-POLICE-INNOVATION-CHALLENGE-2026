import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class HealthStatus(str, enum.Enum):
    online = "online"
    offline = "offline"
    unknown = "unknown"

class Stream(Base):
    __tablename__ = "streams"
    __table_args__ = {"schema": "streaming"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Link to registry-svc camera (soft reference, no FK across services)
    camera_id = Column(UUID(as_uuid=True), nullable=True)
    camera_id_label = Column(String(100), nullable=True)  # e.g. MCD-TFC-001
    department_id = Column(UUID(as_uuid=True), nullable=True)
    department_name = Column(String(200), nullable=True)

    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # RTSP config (store full URL — mask in response schemas)
    rtsp_url = Column(String(500), nullable=False)
    main_stream_suffix = Column(String(200), nullable=True)   # appended to rtsp_url for main
    sub_stream_suffix = Column(String(200), nullable=True)    # appended for sub

    # Health
    health_status = Column(Enum(HealthStatus), default=HealthStatus.unknown)
    last_health_check_at = Column(DateTime, nullable=True)
    last_online_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)
    consecutive_failures = Column(Integer, default=0)

    # Config
    is_active = Column(Boolean, default=True)
    created_by_id = Column(UUID(as_uuid=True), nullable=True)
    created_by_email = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sessions = relationship("StreamSession", back_populates="stream", cascade="all, delete-orphan")

    def get_main_url(self):
        if self.main_stream_suffix:
            return self.rtsp_url.rstrip("/") + self.main_stream_suffix
        return self.rtsp_url

    def get_sub_url(self):
        if self.sub_stream_suffix:
            return self.rtsp_url.rstrip("/") + self.sub_stream_suffix
        return self.rtsp_url
