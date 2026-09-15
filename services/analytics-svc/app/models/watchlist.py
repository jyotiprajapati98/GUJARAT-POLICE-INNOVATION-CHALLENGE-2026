import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class VehicleWatchlist(Base):
    __tablename__ = "vehicle_watchlist"
    __table_args__ = {"schema": "analytics"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plate_text = Column(String(20), unique=True, nullable=False, index=True)
    reason = Column(Text, nullable=True)
    tagged_by_email = Column(String(200), nullable=True)
    active = Column(Boolean, default=True, index=True)
    tagged_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    alerts = relationship("Alert", back_populates="watchlist_entry")
