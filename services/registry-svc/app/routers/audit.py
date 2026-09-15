from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.audit_log import AuditLogResponse
from app.services.auth import get_current_active_user, require_dept_admin

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    user_email: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    resource_id: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_admin),
):
    """
    Paginated audit log retrieval.
    - SUPER_ADMIN sees all logs.
    - DEPT_ADMIN sees only logs for their department.
    """
    query = db.query(AuditLog)

    # Scope to department for dept_admin
    if current_user.role == UserRole.DEPT_ADMIN:
        if current_user.department_id is None:
            return []
        query = query.filter(AuditLog.department_id == current_user.department_id)

    # Apply filters
    if user_email:
        query = query.filter(AuditLog.user_email.ilike(f"%{user_email}%"))
    if action:
        query = query.filter(AuditLog.action == action)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if resource_id:
        query = query.filter(AuditLog.resource_id == resource_id)
    if from_date:
        query = query.filter(AuditLog.created_at >= from_date)
    if to_date:
        query = query.filter(AuditLog.created_at <= to_date)

    query = query.order_by(AuditLog.created_at.desc())

    offset = (page - 1) * limit
    logs = query.offset(offset).limit(limit).all()
    return logs
