from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.stream import Stream, HealthStatus
from app.schemas.stream import StreamHealthResponse
from app.auth import get_current_user, TokenPayload

router = APIRouter(prefix="/health", tags=["Stream Health"])

@router.get("/streams", response_model=List[StreamHealthResponse])
async def list_stream_health(
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(get_current_user),
):
    q = db.query(Stream).filter(Stream.is_active == True)
    if user.role != "super_admin" and user.department_id:
        q = q.filter(Stream.department_id == user.department_id)
    return q.order_by(Stream.health_status).all()

@router.get("/summary")
async def health_summary(
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(get_current_user),
):
    q = db.query(Stream).filter(Stream.is_active == True)
    if user.role != "super_admin" and user.department_id:
        q = q.filter(Stream.department_id == user.department_id)
    streams = q.all()
    return {
        "total": len(streams),
        "online": sum(1 for s in streams if s.health_status == HealthStatus.online),
        "offline": sum(1 for s in streams if s.health_status == HealthStatus.offline),
        "unknown": sum(1 for s in streams if s.health_status == HealthStatus.unknown),
    }
