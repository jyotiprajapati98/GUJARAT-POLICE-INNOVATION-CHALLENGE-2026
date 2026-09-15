import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, func
from sqlalchemy.orm import Session

from app.auth import TokenPayload, get_current_user
from app.database import get_db
from app.models.anpr_event import ANPREvent

router = APIRouter(prefix="/vehicles", tags=["Vehicle Tracking"])

_PLATE_NORMALIZE_RE = re.compile(r'[\s\-]')


def _normalize(plate: str) -> str:
    return _PLATE_NORMALIZE_RE.sub('', plate.upper())


@router.get("/search")
def search_plates(
    plate_text: str = Query(..., description="Plate prefix or partial text for autocomplete"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Autocomplete: return distinct plate texts matching the given prefix.
    Useful for frontend search fields.
    """
    prefix = _normalize(plate_text)
    rows = (
        db.query(ANPREvent.plate_text)
        .filter(ANPREvent.plate_text.ilike(f"{prefix}%"))
        .distinct()
        .order_by(ANPREvent.plate_text)
        .limit(limit)
        .all()
    )
    return {"plates": [r[0] for r in rows]}


@router.get("/{plate_text}/route")
def get_vehicle_route(
    plate_text: str,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    GIS route reconstruction: ordered list of all sightings for a plate.
    Returns sightings ordered by detected_at ASC so the caller can draw a route polyline.
    """
    normalized = _normalize(plate_text)

    events = (
        db.query(ANPREvent)
        .filter(ANPREvent.plate_text == normalized)
        .order_by(asc(ANPREvent.detected_at))
        .all()
    )

    if not events:
        raise HTTPException(status_code=404, detail=f"No sightings found for plate {normalized}")

    sightings = [
        {
            "event_id": str(e.id),
            "camera_id": str(e.camera_id),
            "camera_id_label": e.camera_id_label,
            "detected_at": e.detected_at.isoformat(),
            "confidence": e.confidence,
            "latitude": e.latitude,
            "longitude": e.longitude,
            "location_name": e.location_name,
            "frame_path": e.frame_path,
        }
        for e in events
    ]

    return {
        "plate_text": normalized,
        "total_sightings": len(sightings),
        "first_seen": events[0].detected_at.isoformat(),
        "last_seen": events[-1].detected_at.isoformat(),
        "sightings": sightings,
    }
