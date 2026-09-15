import asyncio
import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.stream import Stream
from app.models.session import StreamSession, SessionStatus
from app.schemas.session import SessionStartRequest, SessionResponse
from app.auth import get_current_user, TokenPayload
from app.services.ffmpeg_manager import ffmpeg_manager
from app.config import settings

router = APIRouter(prefix="/live", tags=["Live Streaming"])

def _build_playlist_url(session_id: str) -> str:
    return f"/hls/{session_id}/stream.m3u8"

@router.post("/{stream_id}/start", response_model=SessionResponse)
async def start_stream(
    stream_id: str,
    request: SessionStartRequest,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(get_current_user),
):
    stream = db.query(Stream).filter(Stream.id == stream_id, Stream.is_active == True).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found or inactive")

    session_id = str(uuid.uuid4())
    hls_dir = os.path.join(settings.HLS_DIR, session_id)

    rtsp_url = stream.get_main_url() if request.quality == "main" else stream.get_sub_url()

    # Create session record
    session = StreamSession(
        id=uuid.UUID(session_id),
        stream_id=stream.id,
        user_email=user.sub,
        quality=request.quality,
        hls_dir=hls_dir,
        playlist_path=f"{session_id}/stream.m3u8",
        status=SessionStatus.starting,
    )
    db.add(session)
    db.commit()

    # Start FFmpeg
    try:
        pid = await asyncio.to_thread(ffmpeg_manager.start_stream, session_id, rtsp_url, hls_dir)
        session.ffmpeg_pid = pid
        session.status = SessionStatus.active
        db.commit()
    except Exception as e:
        session.status = SessionStatus.error
        session.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to start stream: {e}")

    db.refresh(session)
    resp = SessionResponse.model_validate(session)
    resp.playlist_url = _build_playlist_url(session_id)
    return resp

@router.post("/{session_id}/heartbeat")
async def heartbeat(
    session_id: str,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(get_current_user),
):
    session = db.query(StreamSession).filter(
        StreamSession.id == session_id,
        StreamSession.status == SessionStatus.active,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or not active")

    session.last_heartbeat_at = datetime.utcnow()

    # Check if FFmpeg is still running
    if not ffmpeg_manager.is_running(session_id):
        session.status = SessionStatus.error
        session.error_message = "FFmpeg process died unexpectedly"
        db.commit()
        raise HTTPException(status_code=500, detail="Stream process died")

    db.commit()
    return {"status": "ok", "session_id": session_id}

@router.post("/{session_id}/stop")
async def stop_stream(
    session_id: str,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(get_current_user),
):
    session = db.query(StreamSession).filter(StreamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    ffmpeg_manager.stop_stream(session_id)
    ffmpeg_manager.cleanup_hls(session_id, settings.HLS_DIR)

    session.status = SessionStatus.ended
    session.ended_at = datetime.utcnow()
    db.commit()
    return {"message": "Stream stopped", "session_id": session_id}

@router.get("/{session_id}/status", response_model=SessionResponse)
async def get_session_status(
    session_id: str,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(get_current_user),
):
    session = db.query(StreamSession).filter(StreamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    resp = SessionResponse.model_validate(session)
    resp.playlist_url = _build_playlist_url(session_id)
    return resp
