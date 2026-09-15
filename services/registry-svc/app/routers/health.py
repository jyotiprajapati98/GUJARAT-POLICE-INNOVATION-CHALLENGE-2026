from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.camera import Camera, CameraStatus
from app.models.department import Department
from app.models.user import User
from app.services.auth import get_current_active_user

router = APIRouter(prefix="/health-monitor", tags=["Health Monitor"])

UNKNOWN_THRESHOLD_HOURS = 24


def _is_unknown(camera: Camera) -> bool:
    """Camera is 'unknown' if never checked or last check > 24 hours ago."""
    if camera.last_checked_at is None:
        return True
    return (datetime.utcnow() - camera.last_checked_at) > timedelta(hours=UNKNOWN_THRESHOLD_HOURS)


@router.get("/summary")
def get_health_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    System-wide health summary with per-department breakdown and active alerts.
    """
    cameras = (
        db.query(Camera, Department.name.label("dept_name"), Department.id.label("dept_id"))
        .join(Department, Camera.department_id == Department.id)
        .filter(Camera.is_active == True)
        .all()
    )

    total_cameras = len(cameras)
    online = 0
    offline = 0
    degraded = 0
    maintenance = 0
    unknown = 0
    alerts = []

    # Per-department accumulators: {dept_id: {name, total, online, offline, degraded}}
    dept_stats: dict = {}

    for camera, dept_name, dept_id in cameras:
        dept_key = str(dept_id)
        if dept_key not in dept_stats:
            dept_stats[dept_key] = {
                "dept_name": dept_name,
                "total": 0,
                "online": 0,
                "offline": 0,
                "degraded": 0,
            }
        dept_stats[dept_key]["total"] += 1

        cam_unknown = _is_unknown(camera)

        if cam_unknown:
            unknown += 1
        elif camera.status == CameraStatus.active and camera.connectivity_status:
            online += 1
            dept_stats[dept_key]["online"] += 1
        elif camera.status == CameraStatus.faulty:
            degraded += 1
            dept_stats[dept_key]["degraded"] += 1
        elif camera.status == CameraStatus.under_maintenance:
            maintenance += 1
        else:
            offline += 1
            dept_stats[dept_key]["offline"] += 1

        # Alerts: faulty or inactive cameras
        if camera.status in (CameraStatus.faulty, CameraStatus.inactive):
            issue = "Faulty" if camera.status == CameraStatus.faulty else "Inactive"
            alerts.append({
                "camera_id_label": camera.camera_id_label,
                "name": camera.name,
                "dept_name": dept_name,
                "issue": issue,
                "since": camera.updated_at.isoformat() if camera.updated_at else None,
            })

    by_department = list(dept_stats.values())

    return {
        "total_cameras": total_cameras,
        "online": online,
        "offline": offline,
        "degraded": degraded,
        "maintenance": maintenance,
        "unknown": unknown,
        "by_department": by_department,
        "alerts": alerts,
    }


@router.get("/cameras")
def get_health_cameras(
    status: Optional[str] = Query(None),
    department_id: Optional[UUID] = Query(None),
    connectivity_status: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Paginated list of cameras with health-focused columns.
    Filterable by status, department_id, and connectivity_status.
    """
    query = (
        db.query(Camera, Department.name.label("dept_name"))
        .join(Department, Camera.department_id == Department.id)
        .filter(Camera.is_active == True)
    )

    if status:
        try:
            cam_status = CameraStatus(status)
            query = query.filter(Camera.status == cam_status)
        except ValueError:
            pass

    if department_id:
        query = query.filter(Camera.department_id == department_id)

    if connectivity_status is not None:
        query = query.filter(Camera.connectivity_status == connectivity_status)

    total = query.count()
    offset = (page - 1) * limit
    rows = query.offset(offset).limit(limit).all()

    result = []
    for camera, dept_name in rows:
        result.append({
            "camera_id": str(camera.id),
            "camera_id_label": camera.camera_id_label,
            "name": camera.name,
            "dept": dept_name,
            "status": camera.status,
            "connectivity_status": camera.connectivity_status,
            "last_checked_at": camera.last_checked_at.isoformat() if camera.last_checked_at else None,
            "uptime_percentage": camera.uptime_percentage,
            "fault_description": camera.fault_description,
        })

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "cameras": result,
    }
