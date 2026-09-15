import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class IntegrationStatus(str, enum.Enum):
    integration_ready = "integration_ready"
    ready_with_adapter = "ready_with_adapter"
    sdk_required = "sdk_required"
    info_required = "info_required"
    not_integrable = "not_integrable"


class IntegrationReadiness(Base):
    __tablename__ = "integration_readiness"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camera_id = Column(UUID(as_uuid=True), ForeignKey("cameras.id"), unique=True, nullable=False)

    # Protocol availability
    rtsp_available = Column(Boolean, default=False)
    onvif_available = Column(Boolean, default=False)
    rest_api_available = Column(Boolean, default=False)
    vendor_sdk_available = Column(Boolean, default=False)
    metadata_api_available = Column(Boolean, default=False)
    event_api_available = Column(Boolean, default=False)
    live_stream_available = Column(Boolean, default=False)
    playback_api_available = Column(Boolean, default=False)
    ai_capability_available = Column(Boolean, default=False)

    # RTSP details
    rtsp_port = Column(String(10), nullable=True)
    rtsp_tested = Column(Boolean, default=False)
    rtsp_last_tested_at = Column(DateTime, nullable=True)

    # ONVIF details
    onvif_port = Column(String(10), nullable=True)
    onvif_tested = Column(Boolean, default=False)

    # VMS
    vms_vendor = Column(String(200), nullable=True)
    vms_platform = Column(String(200), nullable=True)
    vms_camera_id = Column(String(200), nullable=True)
    vms_site = Column(String(200), nullable=True)
    vms_integration_method = Column(String(100), nullable=True)  # rtsp, onvif, sdk, api

    # Overall status
    integration_status = Column(Enum(IntegrationStatus), default=IntegrationStatus.info_required)
    integration_notes = Column(Text, nullable=True)

    # Audit
    last_assessed_at = Column(DateTime, nullable=True)
    assessed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    camera = relationship("Camera", back_populates="integration_readiness")
    assessed_by = relationship("User", foreign_keys=[assessed_by_id])
