from datetime import datetime, date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.camera import Camera, CameraStatus
from app.models.department import Department
from app.models.integration_readiness import IntegrationReadiness, IntegrationStatus
from app.models.user import User
from app.services.auth import get_current_active_user

router = APIRouter(prefix="/gap-analysis", tags=["Gap Analysis"])

TODAY = None  # resolved at request time


def _get_today() -> date:
    return datetime.utcnow().date()


@router.get("/report")
def get_gap_analysis_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Comprehensive gap analysis report: summary, per-department breakdown, and flagged cameras.
    """
    today = _get_today()
    ninety_days_from_now = date(today.year, today.month, today.day)
    from datetime import timedelta
    warranty_threshold = today + timedelta(days=90)
    six_months_ago = datetime(today.year, today.month, today.day) - timedelta(days=180)

    # Load all active cameras with department
    cameras = (
        db.query(Camera, Department.name.label("dept_name"), Department.code.label("dept_code"))
        .join(Department, Camera.department_id == Department.id)
        .filter(Camera.is_active == True)
        .all()
    )

    # Load integration readiness records keyed by camera_id
    ir_records = {
        str(ir.camera_id): ir
        for ir in db.query(IntegrationReadiness).all()
    }

    total_cameras = len(cameras)
    operational = 0
    non_operational = 0
    cameras_without_analytics = 0
    cameras_no_night_vision = 0
    cameras_expiring_warranty_90days = 0
    cameras_no_maintenance_6months = 0
    not_integrable_count = 0
    info_required_count = 0

    # Per-department accumulators
    dept_map: dict = {}

    # Flagged cameras
    flagged_cameras = []

    for camera, dept_name, dept_code in cameras:
        dept_id = str(camera.department_id)
        if dept_id not in dept_map:
            dept_map[dept_id] = {
                "dept_name": dept_name,
                "dept_code": dept_code,
                "total": 0,
                "active": 0,
                "faulty": 0,
                "inactive": 0,
                "planned": 0,
                "decommissioned": 0,
                "with_analytics": 0,
                "with_night_vision": 0,
            }
        dept = dept_map[dept_id]
        dept["total"] += 1

        # Operational/non-operational
        if camera.status == CameraStatus.active:
            operational += 1
            dept["active"] += 1
        else:
            non_operational += 1
            if camera.status == CameraStatus.faulty:
                dept["faulty"] += 1
            elif camera.status == CameraStatus.inactive:
                dept["inactive"] += 1
            elif camera.status == CameraStatus.planned:
                dept["planned"] += 1
            elif camera.status == CameraStatus.decommissioned:
                dept["decommissioned"] += 1

        # Analytics
        if camera.has_analytics:
            dept["with_analytics"] += 1
        else:
            cameras_without_analytics += 1

        # Night vision
        if camera.has_night_vision:
            dept["with_night_vision"] += 1
        else:
            cameras_no_night_vision += 1

        # Warranty expiring within 90 days
        if camera.warranty_expiry_date and camera.warranty_expiry_date <= warranty_threshold:
            cameras_expiring_warranty_90days += 1

        # No maintenance in 6 months
        if camera.last_maintenance_at is None or camera.last_maintenance_at < six_months_ago:
            cameras_no_maintenance_6months += 1

        # Integration readiness
        ir = ir_records.get(str(camera.id))
        if ir:
            if ir.integration_status == IntegrationStatus.not_integrable:
                not_integrable_count += 1
            elif ir.integration_status == IntegrationStatus.info_required:
                info_required_count += 1
        else:
            info_required_count += 1

        # Flagged cameras: collect issues
        issues = []
        if camera.status == CameraStatus.faulty:
            issues.append("Faulty")
        if camera.status == CameraStatus.inactive:
            issues.append("Inactive")
        if camera.last_maintenance_at is None:
            issues.append("No maintenance record")
        if camera.warranty_expiry_date and camera.warranty_expiry_date < today:
            issues.append("Warranty expired")
        if not camera.has_night_vision:
            issues.append("No night vision")
        if not camera.has_analytics:
            issues.append("No analytics")
        if ir and ir.integration_status == IntegrationStatus.not_integrable:
            issues.append("Not integration ready")

        if issues:
            flagged_cameras.append({
                "camera_id_label": camera.camera_id_label,
                "name": camera.name,
                "dept_name": dept_name,
                "status": camera.status,
                "issues": issues,
            })

    coverage_percentage = round((operational / total_cameras * 100), 2) if total_cameras > 0 else 0.0

    # Build per-department output with gap_flags and coverage_score
    by_department = []
    for dept_data in dept_map.values():
        total = dept_data["total"]
        active = dept_data["active"]
        faulty = dept_data["faulty"]
        with_analytics = dept_data["with_analytics"]
        with_night_vision = dept_data["with_night_vision"]

        coverage_score = round((active / total * 100), 2) if total > 0 else 0.0
        gap_flags = []

        if total > 0 and faulty / total > 0.2:
            gap_flags.append("High fault rate")
        if with_analytics == 0:
            gap_flags.append("No analytics cameras")
        if active == 0:
            gap_flags.append("All cameras inactive/faulty")
        if with_night_vision == 0:
            gap_flags.append("No night vision cameras")

        by_department.append({
            "dept_name": dept_data["dept_name"],
            "dept_code": dept_data["dept_code"],
            "total": total,
            "active": active,
            "faulty": faulty,
            "inactive": dept_data["inactive"],
            "planned": dept_data["planned"],
            "decommissioned": dept_data["decommissioned"],
            "with_analytics": with_analytics,
            "with_night_vision": with_night_vision,
            "coverage_score": coverage_score,
            "gap_flags": gap_flags,
        })

    return {
        "summary": {
            "total_cameras": total_cameras,
            "operational": operational,
            "non_operational": non_operational,
            "coverage_percentage": coverage_percentage,
            "cameras_without_analytics": cameras_without_analytics,
            "cameras_no_night_vision": cameras_no_night_vision,
            "cameras_expiring_warranty_90days": cameras_expiring_warranty_90days,
            "cameras_no_maintenance_6months": cameras_no_maintenance_6months,
            "not_integrable": not_integrable_count,
            "info_required": info_required_count,
        },
        "by_department": by_department,
        "flagged_cameras": flagged_cameras,
    }
