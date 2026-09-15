import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

from app.auth import TokenPayload, get_current_user, require_operator
from app.database import get_db
from app.models.alert import Alert
from app.schemas.alert import AlertResponse

router = APIRouter(prefix="/alerts", tags=["Alerts"])


def _serialize_alert(a: Alert) -> AlertResponse:
    return AlertResponse(
        id=a.id,
        anpr_event_id=a.anpr_event_id,
        watchlist_id=a.watchlist_id,
        camera_id=a.camera_id,
        camera_id_label=a.camera_id_label,
        plate_text=a.plate_text,
        triggered_at=a.triggered_at,
        acknowledged=a.acknowledged,
        acknowledged_by=a.acknowledged_by,
        acknowledged_at=a.acknowledged_at,
        latitude=a.latitude,
        longitude=a.longitude,
        location_name=a.location_name,
        watchlist_reason=a.watchlist_entry.reason if a.watchlist_entry else None,
    )


@router.get("")
def list_alerts(
    acknowledged: Optional[bool] = Query(None, description="Filter by acknowledged status"),
    plate_text: Optional[str] = Query(None),
    camera_id: Optional[uuid.UUID] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Paginated list of alerts ordered by triggered_at DESC.
    Returns total count and unacknowledged count alongside items.
    """
    q = db.query(Alert).options(joinedload(Alert.watchlist_entry))

    if acknowledged is not None:
        q = q.filter(Alert.acknowledged == acknowledged)
    if plate_text:
        q = q.filter(Alert.plate_text.ilike(f"%{plate_text.upper()}%"))
    if camera_id:
        q = q.filter(Alert.camera_id == camera_id)

    total = q.count()

    # Unacknowledged count (global, regardless of other filters)
    unacknowledged_count = (
        db.query(Alert).filter(Alert.acknowledged == False).count()
    )

    items = (
        q.order_by(desc(Alert.triggered_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "items": [_serialize_alert(a) for a in items],
        "total": total,
        "unacknowledged_count": unacknowledged_count,
        "page": page,
        "limit": limit,
    }


@router.patch("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_operator),
):
    """Mark an alert as acknowledged by the current user."""
    alert = (
        db.query(Alert)
        .options(joinedload(Alert.watchlist_entry))
        .filter(Alert.id == alert_id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if alert.acknowledged:
        # Idempotent — already acknowledged, return as-is
        return _serialize_alert(alert)

    alert.acknowledged = True
    alert.acknowledged_by = current_user.sub
    alert.acknowledged_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return _serialize_alert(alert)
