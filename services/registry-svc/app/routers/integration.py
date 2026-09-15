from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.camera import Camera, CameraStatus
from app.models.integration_readiness import IntegrationReadiness, IntegrationStatus
from app.models.department import Department
from app.schemas.integration_readiness import (
    IntegrationReadinessCreate,
    IntegrationReadinessUpdate,
    IntegrationReadinessResponse,
)
from app.services.auth import get_current_active_user, require_operator
from app.models.user import User

router = APIRouter(prefix="/integration", tags=["Integration Readiness"])


def _get_camera_or_404(camera_id: UUID, db: Session) -> Camera:
    camera = db.query(Camera).filter(Camera.id == camera_id, Camera.is_active == True).first()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")
    return camera


@router.get("/cameras/{camera_id}", response_model=IntegrationReadinessResponse)
def get_integration_readiness(
    camera_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get integration readiness record for a camera."""
    _get_camera_or_404(camera_id, db)
    record = db.query(IntegrationReadiness).filter(
        IntegrationReadiness.camera_id == camera_id
    ).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No integration readiness record found for this camera",
        )
    return record


@router.post("/cameras/{camera_id}", response_model=IntegrationReadinessResponse, status_code=status.HTTP_200_OK)
def upsert_integration_readiness(
    camera_id: UUID,
    payload: IntegrationReadinessCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    """Create or update integration readiness for a camera (upsert)."""
    _get_camera_or_404(camera_id, db)

    record = db.query(IntegrationReadiness).filter(
        IntegrationReadiness.camera_id == camera_id
    ).first()

    now = datetime.utcnow()

    if record:
        # Update existing
        update_data = payload.model_dump(exclude={"camera_id"}, exclude_none=False)
        for field, value in update_data.items():
            setattr(record, field, value)
        record.last_assessed_at = now
        record.assessed_by_id = current_user.id
        record.updated_at = now
    else:
        # Create new
        record = IntegrationReadiness(
            camera_id=camera_id,
            last_assessed_at=now,
            assessed_by_id=current_user.id,
            **payload.model_dump(exclude={"camera_id"}),
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return record


@router.put("/cameras/{camera_id}", response_model=IntegrationReadinessResponse)
def update_integration_readiness(
    camera_id: UUID,
    payload: IntegrationReadinessUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    """Update integration readiness for a camera."""
    _get_camera_or_404(camera_id, db)

    record = db.query(IntegrationReadiness).filter(
        IntegrationReadiness.camera_id == camera_id
    ).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No integration readiness record found. Use POST to create one.",
        )

    now = datetime.utcnow()
    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    record.last_assessed_at = now
    record.assessed_by_id = current_user.id
    record.updated_at = now

    db.commit()
    db.refresh(record)
    return record


@router.get("/summary")
def get_integration_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    List of all active cameras with their integration readiness status and score.
    Cameras without a readiness record are shown with status 'info_required' and score 0.
    """
    cameras = (
        db.query(Camera, Department.name.label("dept_name"))
        .join(Department, Camera.department_id == Department.id)
        .filter(Camera.is_active == True)
        .all()
    )

    result = []
    for camera, dept_name in cameras:
        ir = db.query(IntegrationReadiness).filter(
            IntegrationReadiness.camera_id == camera.id
        ).first()

        if ir:
            score = sum(1 for f in [
                ir.rtsp_available,
                ir.onvif_available,
                ir.rest_api_available,
                ir.vendor_sdk_available,
                ir.metadata_api_available,
                ir.event_api_available,
                ir.live_stream_available,
                ir.playback_api_available,
                ir.ai_capability_available,
            ] if f is True)
            int_status = ir.integration_status
        else:
            score = 0
            int_status = IntegrationStatus.info_required

        result.append({
            "camera_id": str(camera.id),
            "camera_id_label": camera.camera_id_label,
            "name": camera.name,
            "dept": dept_name,
            "status": int_status,
            "score": score,
        })

    return result


@router.get("/stats")
def get_integration_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Aggregated stats: breakdown by integration status and overall counts.
    """
    total_cameras = db.query(Camera).filter(Camera.is_active == True).count()
    total_assessed = db.query(IntegrationReadiness).count()

    status_rows = (
        db.query(IntegrationReadiness.integration_status, func.count(IntegrationReadiness.id))
        .group_by(IntegrationReadiness.integration_status)
        .all()
    )
    by_status = {row[0]: row[1] for row in status_rows}

    # Cameras with no record count as info_required
    no_record_count = total_cameras - total_assessed
    if no_record_count > 0:
        existing = by_status.get(IntegrationStatus.info_required, 0)
        by_status[IntegrationStatus.info_required] = existing + no_record_count

    return {
        "by_status": by_status,
        "total_assessed": total_assessed,
        "total_cameras": total_cameras,
    }
