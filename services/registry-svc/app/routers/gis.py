import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.database import get_db
from app.models.camera import Camera, CameraStatus, CameraType
from app.models.department import Department
from app.models.user import User, UserRole
from app.schemas.camera import CameraGeoJSON, GeoJSONFeature, GeoJSONGeometry
from app.services.auth import get_current_active_user

router = APIRouter(prefix="/gis", tags=["GIS"])


@router.get("/cameras", response_model=CameraGeoJSON)
async def get_cameras_geojson(
    department_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    camera_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Camera).filter(Camera.is_active == True)

    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.filter(Camera.department_id == current_user.department_id)

    if department_id and current_user.role == UserRole.SUPER_ADMIN:
        query = query.filter(Camera.department_id == department_id)
    if status:
        query = query.filter(Camera.status == status)
    if camera_type:
        query = query.filter(Camera.camera_type == camera_type)

    cameras = query.all()

    features = []
    for cam in cameras:
        dept_name = cam.department.name if cam.department else ""
        dept_code = cam.department.code if cam.department else ""
        feature = GeoJSONFeature(
            geometry=GeoJSONGeometry(coordinates=[cam.longitude, cam.latitude]),
            properties={
                "id": str(cam.id),
                "camera_id_label": cam.camera_id_label,
                "name": cam.name,
                "status": cam.status.value if cam.status else None,
                "camera_type": cam.camera_type.value if cam.camera_type else None,
                "department_name": dept_name,
                "department_code": dept_code,
                "area": cam.area,
                "address": cam.address,
                "make": cam.make,
                "model_number": cam.model_number,
                "resolution": cam.resolution,
                "has_analytics": cam.has_analytics,
                "is_ptz": cam.is_ptz,
                "has_night_vision": cam.has_night_vision,
                "analytics_types": cam.analytics_types,
                "coverage_type": cam.coverage_type.value if cam.coverage_type else None,
                "coverage_radius_m": cam.coverage_radius_m,
                "installation_height_m": cam.installation_height_m,
            },
        )
        features.append(feature)

    return CameraGeoJSON(features=features)


@router.get("/departments-summary")
async def get_departments_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    dept_query = (
        db.query(
            Department.id,
            Department.name,
            Department.code,
            func.count(Camera.id).label("camera_count"),
            func.avg(Camera.latitude).label("lat_center"),
            func.avg(Camera.longitude).label("lng_center"),
        )
        .outerjoin(
            Camera,
            (Camera.department_id == Department.id) & (Camera.is_active == True),
        )
        .filter(Department.is_active == True)
        .group_by(Department.id, Department.name, Department.code)
    )

    if current_user.role != UserRole.SUPER_ADMIN:
        dept_query = dept_query.filter(Department.id == current_user.department_id)

    results = dept_query.all()

    summary = []
    for r in results:
        active_count = (
            db.query(func.count(Camera.id))
            .filter(
                Camera.department_id == r.id,
                Camera.is_active == True,
                Camera.status == CameraStatus.active,
            )
            .scalar()
        )
        summary.append(
            {
                "department_name": r.name,
                "code": r.code,
                "camera_count": r.camera_count or 0,
                "active_count": active_count or 0,
                "lat_center": float(r.lat_center) if r.lat_center else None,
                "lng_center": float(r.lng_center) if r.lng_center else None,
            }
        )

    return summary


@router.get("/heatmap-data")
async def get_heatmap_data(
    department_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Camera.latitude, Camera.longitude, Camera.status).filter(
        Camera.is_active == True
    )

    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.filter(Camera.department_id == current_user.department_id)

    if department_id and current_user.role == UserRole.SUPER_ADMIN:
        query = query.filter(Camera.department_id == department_id)
    if status:
        query = query.filter(Camera.status == status)

    cameras = query.all()

    heatmap = []
    for cam in cameras:
        if cam.status == CameraStatus.active:
            weight = 1.0
        elif cam.status == CameraStatus.faulty:
            weight = 0.3
        elif cam.status == CameraStatus.under_maintenance:
            weight = 0.5
        else:
            weight = 0.1
        heatmap.append([cam.latitude, cam.longitude, weight])

    return heatmap
