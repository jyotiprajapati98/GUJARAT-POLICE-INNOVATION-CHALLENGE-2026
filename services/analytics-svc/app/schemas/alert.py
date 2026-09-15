from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class AlertResponse(BaseModel):
    id: UUID
    anpr_event_id: UUID
    watchlist_id: UUID
    camera_id: UUID
    camera_id_label: Optional[str] = None
    plate_text: str
    triggered_at: datetime
    acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    # Flattened from watchlist relationship for convenience
    watchlist_reason: Optional[str] = None

    model_config = {"from_attributes": True}


class AlertAcknowledge(BaseModel):
    """Empty body — the PATCH endpoint only needs the alert id from the path."""
    pass
