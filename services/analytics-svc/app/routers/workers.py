import re
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import TokenPayload, get_current_user, require_operator
from app.database import get_db
from app.models.ingestion_worker import IngestionWorker, WorkerStatus
from app.schemas.worker import WorkerResponse, WorkerStartRequest
from app.services.ingestion_service import ingestion_service

router = APIRouter(prefix="/ingest", tags=["Ingestion Workers"])


def _mask_url(url: str) -> str:
    return re.sub(r'(rtsp://)[^@]+@', r'\1****@', url)


def _build_response(worker_db: IngestionWorker, service_running: bool) -> WorkerResponse:
    resp = WorkerResponse.model_validate(worker_db)
    resp.is_running = service_running
    # Reflect live stats if worker is currently active
    live = ingestion_service.get_worker(str(worker_db.id))
    if live:
        resp.frames_processed = live.frames_processed
        resp.detections_count = live.detections_count
    return resp


@router.post("/workers", response_model=WorkerResponse, status_code=status.HTTP_201_CREATED)
async def start_worker(
    body: WorkerStartRequest,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_operator),
):
    """Start a new ANPR ingestion worker for a camera."""
    worker_id = uuid.uuid4()
    camera_id = body.camera_id or uuid.uuid4()

    # Persist to DB
    db_worker = IngestionWorker(
        id=worker_id,
        camera_id=camera_id,
        camera_id_label=body.camera_id_label,
        rtsp_url_masked=_mask_url(body.rtsp_url),
        status=WorkerStatus.running,
        started_at=datetime.utcnow(),
        last_heartbeat=datetime.utcnow(),
    )
    db.add(db_worker)
    db.commit()
    db.refresh(db_worker)

    # Start async worker task
    try:
        await ingestion_service.start_worker(
            worker_id=str(worker_id),
            camera_id=str(camera_id),
            camera_id_label=body.camera_id_label or "",
            rtsp_url=body.rtsp_url,
            latitude=body.latitude,
            longitude=body.longitude,
            location_name=body.location_name,
        )
    except Exception as exc:
        db_worker.status = WorkerStatus.crashed
        db_worker.error_message = str(exc)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start worker: {exc}",
        )

    return _build_response(db_worker, service_running=True)


@router.get("/workers", response_model=List[WorkerResponse])
def list_workers(
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """List all ingestion workers (DB records enriched with live status)."""
    workers = db.query(IngestionWorker).order_by(IngestionWorker.started_at.desc()).all()
    return [
        _build_response(w, service_running=ingestion_service.is_running(str(w.id)))
        for w in workers
    ]


@router.get("/workers/{worker_id}", response_model=WorkerResponse)
def get_worker(
    worker_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """Get a single worker by ID with live stats."""
    db_worker = db.query(IngestionWorker).filter(IngestionWorker.id == worker_id).first()
    if not db_worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return _build_response(
        db_worker, service_running=ingestion_service.is_running(str(worker_id))
    )


@router.delete("/workers/{worker_id}", status_code=status.HTTP_204_NO_CONTENT)
async def stop_worker(
    worker_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_operator),
):
    """Stop a running ingestion worker."""
    db_worker = db.query(IngestionWorker).filter(IngestionWorker.id == worker_id).first()
    if not db_worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    await ingestion_service.stop_worker(str(worker_id))

    db_worker.status = WorkerStatus.stopped
    db_worker.stopped_at = datetime.utcnow()
    db.commit()
