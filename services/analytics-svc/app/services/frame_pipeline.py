"""
Saves an ANPR detection as anpr_event, checks watchlist, creates alert, pushes WebSocket.
"""
import logging
import uuid
from datetime import datetime
from typing import Optional

from app.database import SessionLocal
from app.models.alert import Alert
from app.models.anpr_event import ANPREvent
from app.models.watchlist import VehicleWatchlist
from app.ws.manager import manager

logger = logging.getLogger(__name__)


async def process_frame(
    camera_id: str,
    camera_id_label: str,
    plate_text: str,
    confidence: float,
    detect_confidence: float,
    detected_at: datetime,
    frame_path: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_name: Optional[str] = None,
):
    db = SessionLocal()
    try:
        # Save anpr_event
        event = ANPREvent(
            id=uuid.uuid4(),
            camera_id=camera_id,
            camera_id_label=camera_id_label,
            plate_text=plate_text,
            confidence=confidence,
            detect_confidence=detect_confidence,
            detected_at=detected_at,
            frame_path=frame_path,
            latitude=latitude,
            longitude=longitude,
            location_name=location_name,
        )
        db.add(event)
        db.flush()

        logger.info(f"ANPR: {plate_text} ({confidence:.2f}) @ {camera_id_label}")

        # Check watchlist
        watchlist_entry = (
            db.query(VehicleWatchlist)
            .filter(
                VehicleWatchlist.plate_text == plate_text,
                VehicleWatchlist.active == True,
            )
            .first()
        )

        if watchlist_entry:
            # Create alert
            alert = Alert(
                id=uuid.uuid4(),
                anpr_event_id=event.id,
                watchlist_id=watchlist_entry.id,
                camera_id=camera_id,
                camera_id_label=camera_id_label,
                plate_text=plate_text,
                triggered_at=detected_at,
                latitude=latitude,
                longitude=longitude,
                location_name=location_name,
            )
            db.add(alert)
            db.commit()

            # Push real-time alert via WebSocket
            await manager.broadcast({
                "type": "alert",
                "alert_id": str(alert.id),
                "plate_text": plate_text,
                "camera_id_label": camera_id_label,
                "location_name": location_name or "",
                "latitude": latitude,
                "longitude": longitude,
                "confidence": confidence,
                "reason": watchlist_entry.reason or "",
                "triggered_at": detected_at.isoformat(),
            })
            logger.warning(
                f"ALERT: {plate_text} spotted at {camera_id_label} — {watchlist_entry.reason}"
            )
        else:
            db.commit()

    except Exception as e:
        logger.error(f"frame_pipeline error: {e}")
        db.rollback()
    finally:
        db.close()
