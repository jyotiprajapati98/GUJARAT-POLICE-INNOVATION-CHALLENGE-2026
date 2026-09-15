import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String(200), nullable=True)   # snapshot at time of action
    department_id = Column(UUID(as_uuid=True), nullable=True)
    department_name = Column(String(200), nullable=True)  # snapshot

    action = Column(String(100), nullable=False)          # CREATE_CAMERA, UPDATE_CAMERA, DELETE_CAMERA, LOGIN, etc.
    resource_type = Column(String(100), nullable=True)    # camera, user, department, integration_readiness
    resource_id = Column(String(200), nullable=True)      # UUID or label of affected record

    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    request_method = Column(String(10), nullable=True)
    request_path = Column(String(500), nullable=True)

    details = Column(JSONB, nullable=True)                # extra context dict
    result = Column(String(20), nullable=True)            # success, failure

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
