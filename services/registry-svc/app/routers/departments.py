import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.department import Department
from app.models.camera import Camera
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.services.auth import get_current_active_user, require_super_admin
from app.models.user import User

router = APIRouter(prefix="/departments", tags=["Departments"])


def _dept_to_response(dept: Department, db: Session) -> DepartmentResponse:
    camera_count = (
        db.query(Camera)
        .filter(Camera.department_id == dept.id, Camera.is_active == True)
        .count()
    )
    resp = DepartmentResponse.model_validate(dept)
    resp.camera_count = camera_count
    return resp


@router.get("/", response_model=List[DepartmentResponse])
async def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    depts = db.query(Department).filter(Department.is_active == True).all()
    return [_dept_to_response(d, db) for d in depts]


@router.post("/", response_model=DepartmentResponse)
async def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    existing = db.query(Department).filter(
        (Department.name == payload.name) | (Department.code == payload.code)
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Department with this name or code already exists",
        )

    dept = Department(id=uuid.uuid4(), **payload.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return _dept_to_response(dept, db)


@router.get("/{dept_id}", response_model=DepartmentResponse)
async def get_department(
    dept_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return _dept_to_response(dept, db)


@router.put("/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: uuid.UUID,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dept, key, value)

    db.commit()
    db.refresh(dept)
    return _dept_to_response(dept, db)


@router.delete("/{dept_id}")
async def delete_department(
    dept_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    dept.is_active = False
    db.commit()
    return {"message": f"Department '{dept.name}' has been deactivated"}
