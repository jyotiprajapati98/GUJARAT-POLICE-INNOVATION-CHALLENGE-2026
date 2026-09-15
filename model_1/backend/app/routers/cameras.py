import uuid
import io
import csv
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from geoalchemy2.elements import WKTElement
from app.database import get_db
from app.models.camera import Camera, CameraStatus, CameraType
from app.models.department import Department
from app.models.user import User, UserRole
from app.schemas.camera import CameraCreate, CameraUpdate, CameraResponse, CameraListItem
from app.services.auth import get_current_active_user, require_operator, require_dept_admin
from app.utils.csv_import import parse_camera_csv

router = APIRouter(prefix="/cameras", tags=["Cameras"])


def _camera_to_response(camera: Camera, db: Session) -> CameraResponse:
    data = CameraResponse.model_validate(camera)
    if camera.department:
        data.department_name = camera.department.name
    return data


def _camera_to_list_item(camera: Camera) -> CameraListItem:
    item = CameraListItem.model_validate(camera)
    if camera.department:
        item.department_name = camera.department.name
    return item


def _apply_dept_filter(query, current_user: User):
    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.filter(Camera.department_id == current_user.department_id)
    return query


@router.get("/stats")
async def get_camera_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    base_query = db.query(Camera).filter(Camera.is_active == True)
    if current_user.role != UserRole.SUPER_ADMIN:
        base_query = base_query.filter(Camera.department_id == current_user.department_id)

    total = base_query.count()

    by_status = {}
    for s in CameraStatus:
        count = base_query.filter(Camera.status == s).count()
        by_status[s.value] = count

    by_type = {}
    for cam_type in CameraType:
        count = base_query.filter(Camera.camera_type == cam_type).count()
        by_type[cam_type.value] = count

    dept_query = (
        db.query(
            Department.name,
            Department.code,
            func.count(Camera.id).label("count"),
        )
        .join(Camera, Camera.department_id == Department.id)
        .filter(Camera.is_active == True)
        .group_by(Department.id, Department.name, Department.code)
    )

    if current_user.role != UserRole.SUPER_ADMIN:
        dept_query = dept_query.filter(Department.id == current_user.department_id)

    by_dept = dept_query.all()

    return {
        "total": total,
        "by_status": by_status,
        "by_type": by_type,
        "by_department": [
            {"name": r.name, "code": r.code, "count": r.count} for r in by_dept
        ],
    }


@router.get("/export/csv")
async def export_cameras_csv(
    department_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    camera_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Camera).filter(Camera.is_active == True)
    query = _apply_dept_filter(query, current_user)

    if department_id and current_user.role == UserRole.SUPER_ADMIN:
        query = query.filter(Camera.department_id == department_id)
    if status:
        query = query.filter(Camera.status == status)
    if camera_type:
        query = query.filter(Camera.camera_type == camera_type)

    cameras = query.all()

    output = io.StringIO()
    writer = csv.writer(output)

    headers = [
        "camera_id_label", "name", "status", "camera_type", "latitude", "longitude",
        "address", "area", "zone", "ward", "district", "city", "state", "pincode",
        "department", "make", "model_number", "resolution", "serial_number",
        "network_type", "storage_type", "retention_period_days",
        "has_night_vision", "is_ptz", "has_analytics", "analytics_types",
        "ip_address", "installation_date", "warranty_expiry_date", "remarks",
    ]
    writer.writerow(headers)

    for cam in cameras:
        dept_name = cam.department.name if cam.department else ""
        writer.writerow([
            cam.camera_id_label,
            cam.name,
            cam.status.value if cam.status else "",
            cam.camera_type.value if cam.camera_type else "",
            cam.latitude,
            cam.longitude,
            cam.address or "",
            cam.area or "",
            cam.zone or "",
            cam.ward or "",
            cam.district or "",
            cam.city or "",
            cam.state or "",
            cam.pincode or "",
            dept_name,
            cam.make or "",
            cam.model_number or "",
            cam.resolution or "",
            cam.serial_number or "",
            cam.network_type.value if cam.network_type else "",
            cam.storage_type.value if cam.storage_type else "",
            cam.retention_period_days or "",
            cam.has_night_vision,
            cam.is_ptz,
            cam.has_analytics,
            cam.analytics_types or "",
            cam.ip_address or "",
            cam.installation_date or "",
            cam.warranty_expiry_date or "",
            cam.remarks or "",
        ])

    output.seek(0)
    filename = f"cameras_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/", response_model=List[CameraListItem])
async def list_cameras(
    department_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    camera_type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Camera).filter(Camera.is_active == True)
    query = _apply_dept_filter(query, current_user)

    if department_id and current_user.role == UserRole.SUPER_ADMIN:
        query = query.filter(Camera.department_id == department_id)
    if status:
        query = query.filter(Camera.status == status)
    if camera_type:
        query = query.filter(Camera.camera_type == camera_type)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            Camera.name.ilike(search_term)
            | Camera.camera_id_label.ilike(search_term)
            | Camera.address.ilike(search_term)
            | Camera.area.ilike(search_term)
        )

    offset = (page - 1) * limit
    cameras = query.offset(offset).limit(limit).all()
    return [_camera_to_list_item(c) for c in cameras]


@router.post("/", response_model=CameraResponse)
async def create_camera(
    payload: CameraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    if current_user.role != UserRole.SUPER_ADMIN:
        if payload.department_id != current_user.department_id:
            raise HTTPException(
                status_code=403, detail="Cannot create camera for another department"
            )

    existing = db.query(Camera).filter(
        Camera.camera_id_label == payload.camera_id_label
    ).first()
    if existing:
        raise HTTPException(
            status_code=400, detail="Camera with this ID label already exists"
        )

    dept = db.query(Department).filter(Department.id == payload.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    camera_data = payload.model_dump()
    lat = camera_data.pop("latitude")
    lng = camera_data.pop("longitude")
    department_id = camera_data.pop("department_id")

    camera = Camera(
        id=uuid.uuid4(),
        latitude=lat,
        longitude=lng,
        location=WKTElement(f"POINT({lng} {lat})", srid=4326),
        department_id=department_id,
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
        **camera_data,
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return _camera_to_response(camera, db)


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(
    camera_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    camera = db.query(Camera).filter(
        Camera.id == camera_id, Camera.is_active == True
    ).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    if (
        current_user.role != UserRole.SUPER_ADMIN
        and camera.department_id != current_user.department_id
    ):
        raise HTTPException(status_code=403, detail="Access denied")
    return _camera_to_response(camera, db)


@router.put("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: uuid.UUID,
    payload: CameraUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    camera = db.query(Camera).filter(
        Camera.id == camera_id, Camera.is_active == True
    ).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    if (
        current_user.role != UserRole.SUPER_ADMIN
        and camera.department_id != current_user.department_id
    ):
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = payload.model_dump(exclude_unset=True)

    # Update geometry if lat/lng changed
    new_lat = update_data.pop("latitude", None)
    new_lng = update_data.pop("longitude", None)
    if new_lat is not None:
        camera.latitude = new_lat
    if new_lng is not None:
        camera.longitude = new_lng
    if new_lat is not None or new_lng is not None:
        lat = new_lat if new_lat is not None else camera.latitude
        lng = new_lng if new_lng is not None else camera.longitude
        camera.location = WKTElement(f"POINT({lng} {lat})", srid=4326)

    for key, value in update_data.items():
        setattr(camera, key, value)

    camera.updated_by_id = current_user.id
    db.commit()
    db.refresh(camera)
    return _camera_to_response(camera, db)


@router.delete("/{camera_id}")
async def delete_camera(
    camera_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_admin),
):
    camera = db.query(Camera).filter(
        Camera.id == camera_id, Camera.is_active == True
    ).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    if (
        current_user.role != UserRole.SUPER_ADMIN
        and camera.department_id != current_user.department_id
    ):
        raise HTTPException(status_code=403, detail="Access denied")

    camera.is_active = False
    camera.updated_by_id = current_user.id
    db.commit()
    return {"message": f"Camera '{camera.camera_id_label}' has been decommissioned"}


@router.post("/bulk-import")
async def bulk_import_cameras(
    file: UploadFile = File(...),
    department_id: uuid.UUID = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    if current_user.role != UserRole.SUPER_ADMIN and department_id != current_user.department_id:
        raise HTTPException(
            status_code=403, detail="Cannot import cameras for another department"
        )

    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    valid_records, errors = parse_camera_csv(content, department_id, current_user.id)

    success_count = 0
    import_errors = list(errors)

    for record in valid_records:
        existing = db.query(Camera).filter(
            Camera.camera_id_label == record["camera_id_label"]
        ).first()
        if existing:
            import_errors.append(
                f"Duplicate camera_id_label: {record['camera_id_label']}"
            )
            continue

        wkt = record.pop("location")
        camera = Camera(
            location=WKTElement(wkt, srid=4326),
            **record,
        )
        db.add(camera)
        success_count += 1

    db.commit()

    return {
        "success_count": success_count,
        "error_count": len(import_errors),
        "errors": import_errors,
    }
