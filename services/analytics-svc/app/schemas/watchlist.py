from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class WatchlistCreate(BaseModel):
    plate_text: str
    reason: Optional[str] = None


class WatchlistUpdate(BaseModel):
    reason: Optional[str] = None
    active: Optional[bool] = None


class WatchlistResponse(BaseModel):
    id: UUID
    plate_text: str
    reason: Optional[str] = None
    tagged_by_email: Optional[str] = None
    active: bool
    tagged_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
