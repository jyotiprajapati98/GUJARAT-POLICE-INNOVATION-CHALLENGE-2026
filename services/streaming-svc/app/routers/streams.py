from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.stream import Stream
from app.schemas.stream import StreamCreate, StreamUpdate, StreamResponse, StreamHealthResponse
from app.auth import get_current_user, require_operator, TokenPayload

router = APIRouter(prefix="/streams", tags=["Stream Registry"])

@router.get("/", response_model=List[StreamResponse])
async def list_streams(
    is_active: Optional[bool] = None,
    health_status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(get_current_user),
):
    q = db.query(Stream)
    if is_active is not None:
        q = q.filter(Stream.is_active == is_active)
    if health_status:
        q = q.filter(Stream.health_status == health_status)
    if user.role not in ("super_admin",) and user.department_id:
        q = q.filter(Stream.department_id == user.department_id)
    streams = q.order_by(Stream.created_at.desc()).all()
    return [StreamResponse.from_orm_masked(s) for s in streams]

@router.post("/", response_model=StreamResponse)
async def create_stream(
    data: StreamCreate,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(require_operator),
):
    stream = Stream(**data.model_dump(), created_by_email=user.sub, created_by_id=None)
    db.add(stream)
    db.commit()
    db.refresh(stream)
    return StreamResponse.from_orm_masked(stream)

@router.get("/{stream_id}", response_model=StreamResponse)
async def get_stream(
    stream_id: str,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(get_current_user),
):
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    return StreamResponse.from_orm_masked(stream)

@router.put("/{stream_id}", response_model=StreamResponse)
async def update_stream(
    stream_id: str,
    data: StreamUpdate,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(require_operator),
):
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(stream, k, v)
    stream.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(stream)
    return StreamResponse.from_orm_masked(stream)

@router.delete("/{stream_id}")
async def delete_stream(
    stream_id: str,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(require_operator),
):
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    db.delete(stream)
    db.commit()
    return {"message": "Stream deleted"}

@router.post("/{stream_id}/health-check")
async def trigger_health_check(
    stream_id: str,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(get_current_user),
):
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    from app.services.health_checker import check_stream_health
    status = await check_stream_health(stream, db)
    return {"stream_id": stream_id, "health_status": status}
