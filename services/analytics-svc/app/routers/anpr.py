import asyncio
import os
import tempfile
import uuid
from datetime import datetime
from typing import Dict, Optional

import cv2
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.auth import TokenPayload, get_current_user, require_operator
from app.database import get_db
from app.models.alert import Alert
from app.models.anpr_event import ANPREvent
from app.schemas.anpr_event import ANPREventCreate, ANPREventResponse

router = APIRouter(prefix="/anpr", tags=["ANPR Events"])

# In-memory job store for video test uploads (testing only, not persisted)
_jobs: Dict[str, dict] = {}

MAX_VIDEO_SECONDS = 300  # 5 minutes


@router.get("/events")
def list_events(
    plate_text: Optional[str] = Query(None, description="Partial plate text (case-insensitive)"),
    camera_id: Optional[uuid.UUID] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """Paginated ANPR event search with filters."""
    q = db.query(ANPREvent)

    if plate_text:
        q = q.filter(ANPREvent.plate_text.ilike(f"%{plate_text.upper()}%"))
    if camera_id:
        q = q.filter(ANPREvent.camera_id == camera_id)
    if from_date:
        q = q.filter(ANPREvent.detected_at >= from_date)
    if to_date:
        q = q.filter(ANPREvent.detected_at <= to_date)

    total = q.count()
    items = (
        q.order_by(desc(ANPREvent.detected_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "items": [ANPREventResponse.model_validate(e) for e in items],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/events/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """Dashboard statistics for ANPR events."""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_detections = db.query(func.count(ANPREvent.id)).scalar() or 0
    unique_plates = db.query(func.count(func.distinct(ANPREvent.plate_text))).scalar() or 0
    today_detections = (
        db.query(func.count(ANPREvent.id))
        .filter(ANPREvent.detected_at >= today_start)
        .scalar()
        or 0
    )
    watchlist_matches = db.query(func.count(Alert.id)).scalar() or 0

    # Top 10 cameras by detection count
    top_cameras_rows = (
        db.query(ANPREvent.camera_id_label, func.count(ANPREvent.id).label("cnt"))
        .group_by(ANPREvent.camera_id_label)
        .order_by(desc("cnt"))
        .limit(10)
        .all()
    )
    top_cameras = [{"camera_id_label": r[0], "count": r[1]} for r in top_cameras_rows]

    # Top 10 plates by frequency
    top_plates_rows = (
        db.query(ANPREvent.plate_text, func.count(ANPREvent.id).label("cnt"))
        .group_by(ANPREvent.plate_text)
        .order_by(desc("cnt"))
        .limit(10)
        .all()
    )
    top_plates = [{"plate_text": r[0], "count": r[1]} for r in top_plates_rows]

    return {
        "total_detections": total_detections,
        "unique_plates": unique_plates,
        "today_detections": today_detections,
        "watchlist_matches": watchlist_matches,
        "top_cameras": top_cameras,
        "top_plates": top_plates,
    }


@router.post("/events", response_model=ANPREventResponse, status_code=201)
def create_event(
    body: ANPREventCreate,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_operator),
):
    """Manually submit an ANPR detection (useful for testing without a live camera)."""
    event = ANPREvent(
        id=uuid.uuid4(),
        camera_id=body.camera_id,
        camera_id_label=body.camera_id_label,
        stream_id=body.stream_id,
        plate_text=body.plate_text.upper().replace(" ", "").replace("-", ""),
        confidence=body.confidence,
        detect_confidence=body.detect_confidence,
        detected_at=body.detected_at,
        frame_path=body.frame_path,
        latitude=body.latitude,
        longitude=body.longitude,
        location_name=body.location_name,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return ANPREventResponse.model_validate(event)


def _process_video_job(job_id: str, video_path: str):
    """Run ANPR at 1fps on every frame of the uploaded video. Blocking — runs in threadpool."""
    from app.services.anpr_engine import ANPREngine

    job = _jobs[job_id]
    cap = cv2.VideoCapture(video_path)

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_s = total_frames / fps
    sample_every = max(1, int(fps))  # 1fps — take one frame per second

    job["total_frames"] = int(duration_s)
    job["status"] = "processing"

    engine = ANPREngine.get()
    detections = []
    frame_idx = 0
    processed = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_every == 0:
                timestamp_s = frame_idx / fps
                processed += 1
                job["processed_frames"] = processed

                if engine:
                    results = engine.detect(frame)
                    for det in results:
                        detections.append({
                            "plate_text": det["plate_text"],
                            "confidence": det["confidence"],
                            "detect_confidence": det["detect_confidence"],
                            "timestamp_s": round(timestamp_s, 2),
                            "timestamp_label": _fmt_seconds(timestamp_s),
                        })

            frame_idx += 1

    finally:
        cap.release()
        try:
            os.unlink(video_path)
        except OSError:
            pass

    # Deduplicate: keep highest confidence per plate per second-bucket
    seen = {}
    for d in detections:
        key = (d["plate_text"], int(d["timestamp_s"]))
        if key not in seen or d["confidence"] > seen[key]["confidence"]:
            seen[key] = d
    unique = sorted(seen.values(), key=lambda x: x["timestamp_s"])

    job["status"] = "done"
    job["detections"] = unique
    job["total_detections"] = len(unique)
    job["unique_plates"] = len({d["plate_text"] for d in unique})


def _fmt_seconds(s: float) -> str:
    m = int(s) // 60
    sec = int(s) % 60
    return f"{m:02d}:{sec:02d}"


@router.post("/upload-test")
async def upload_video_test(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Upload a video file (mp4/avi/mov, max 5 min) for ANPR testing.
    Returns a job_id — poll GET /anpr/upload-test/{job_id} for results.
    """
    allowed = {"video/mp4", "video/avi", "video/x-msvideo", "video/quicktime",
               "video/x-matroska", "video/webm", "application/octet-stream"}
    if file.content_type not in allowed and not file.filename.lower().endswith(
        (".mp4", ".avi", ".mov", ".mkv", ".webm")
    ):
        raise HTTPException(status_code=400, detail="Unsupported file type. Use mp4, avi, mov, mkv or webm.")

    # Save to temp file
    suffix = os.path.splitext(file.filename)[-1] or ".mp4"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        contents = await file.read()
        tmp.write(contents)
        tmp.flush()
        tmp_path = tmp.name
    finally:
        tmp.close()

    # Quick duration check
    cap = cv2.VideoCapture(tmp_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()
    duration_s = total_frames / fps if fps else 0

    if duration_s > MAX_VIDEO_SECONDS:
        os.unlink(tmp_path)
        raise HTTPException(
            status_code=400,
            detail=f"Video is {int(duration_s)}s — maximum allowed is {MAX_VIDEO_SECONDS}s (5 minutes).",
        )

    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "filename": file.filename,
        "duration_s": round(duration_s, 1),
        "total_frames": int(duration_s),
        "processed_frames": 0,
        "detections": [],
        "total_detections": 0,
        "unique_plates": 0,
    }

    background_tasks.add_task(_process_video_job, job_id, tmp_path)
    return _jobs[job_id]


@router.get("/upload-test/{job_id}")
def get_video_test_result(
    job_id: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Poll for video test ANPR results."""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/frame/{event_id}")
def get_frame(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """Stream the captured frame JPEG for a given ANPR event."""
    event = db.query(ANPREvent).filter(ANPREvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not event.frame_path:
        raise HTTPException(status_code=404, detail="No frame available for this event")

    import os
    if not os.path.isfile(event.frame_path):
        raise HTTPException(status_code=404, detail="Frame file not found on disk")

    return FileResponse(
        event.frame_path,
        media_type="image/jpeg",
        filename=f"frame_{event_id}.jpg",
    )
