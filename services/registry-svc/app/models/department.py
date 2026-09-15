import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    contact_email = Column(String(200), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    head_name = Column(String(200), nullable=True)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="department")
    cameras = relationship("Camera", back_populates="department", foreign_keys="Camera.department_id")
