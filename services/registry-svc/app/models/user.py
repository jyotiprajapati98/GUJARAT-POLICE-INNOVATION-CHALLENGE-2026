import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    DEPT_ADMIN = "dept_admin"
    OPERATOR = "operator"
    VIEWER = "viewer"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(200), unique=True, nullable=False, index=True)
    full_name = Column(String(200), nullable=False)
    hashed_password = Column(String(500), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.VIEWER, nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    department = relationship("Department", back_populates="users")
