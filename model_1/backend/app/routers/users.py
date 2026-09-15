import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User, UserRole
from app.models.department import Department
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserWithDept
from app.services.auth import (
    get_password_hash, require_dept_admin, require_super_admin, get_current_active_user
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=List[UserWithDept])
async def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_admin),
):
    query = db.query(User)
    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.filter(User.department_id == current_user.department_id)
    users = query.filter(User.is_active == True).all()
    return users


@router.post("/", response_model=UserResponse)
async def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_admin),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Dept admin can only create users for their own department
    if current_user.role == UserRole.DEPT_ADMIN:
        if payload.department_id and payload.department_id != current_user.department_id:
            raise HTTPException(
                status_code=403, detail="Cannot create user for another department"
            )
        if payload.role in [UserRole.SUPER_ADMIN, UserRole.DEPT_ADMIN]:
            raise HTTPException(status_code=403, detail="Cannot create admin users")
        payload.department_id = current_user.department_id

    if payload.department_id:
        dept = db.query(Department).filter(Department.id == payload.department_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")

    user = User(
        id=uuid.uuid4(),
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        department_id=payload.department_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserWithDept)
async def get_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if (
        current_user.role != UserRole.SUPER_ADMIN
        and user.department_id != current_user.department_id
    ):
        raise HTTPException(status_code=403, detail="Access denied")
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dept_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if (
        current_user.role != UserRole.SUPER_ADMIN
        and user.department_id != current_user.department_id
    ):
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = payload.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user.is_active = False
    db.commit()
    return {"message": f"User '{user.email}' has been deactivated"}
