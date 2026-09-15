import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ANPREvent(Base):
    __tablename__ = "anpr_events"
    __table_args__ = {"schema": "analytics"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camera_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    camera_id_label = Column(String(100))
    stream_id = Column(UUID(as_uuid=True), nullable=True)

    plate_text = Column(String(20), nullable=False, index=True)
    confidence = Column(Float, nullable=False)
    detect_confidence = Column(Float, nullable=True)

    detected_at = Column(DateTime, nullable=False, index=True)

    # Geolocation — copied from registry at detection time (not joined live)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String(200), nullable=True)

    frame_path = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    alert = relationship("Alert", back_populates="anpr_event", uselist=False)
