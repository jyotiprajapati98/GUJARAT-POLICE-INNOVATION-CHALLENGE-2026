import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, Text, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class WorkerStatus(str, enum.Enum):
    running = "running"
    stopped = "stopped"
    crashed = "crashed"


class IngestionWorker(Base):
    __tablename__ = "ingestion_workers"
    __table_args__ = {"schema": "analytics"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camera_id = Column(UUID(as_uuid=True), nullable=False)
    camera_id_label = Column(String(100))
    rtsp_url_masked = Column(String(500))

    status = Column(Enum(WorkerStatus, schema="analytics"), default=WorkerStatus.running)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, default=datetime.utcnow)
    stopped_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    # Stats
    frames_processed = Column(Integer, default=0)
    detections_count = Column(Integer, default=0)
