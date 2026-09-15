import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = {"schema": "analytics"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    anpr_event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analytics.anpr_events.id"),
        nullable=False,
    )
    watchlist_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analytics.vehicle_watchlist.id"),
        nullable=False,
    )
    camera_id = Column(UUID(as_uuid=True), nullable=False)
    camera_id_label = Column(String(100))
    plate_text = Column(String(20), nullable=False, index=True)

    triggered_at = Column(DateTime, default=datetime.utcnow, index=True)

    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String(200), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)

    # Snapshot of camera location at alert time
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String(200), nullable=True)

    anpr_event = relationship("ANPREvent", back_populates="alert")
    watchlist_entry = relationship("VehicleWatchlist", back_populates="alerts")
