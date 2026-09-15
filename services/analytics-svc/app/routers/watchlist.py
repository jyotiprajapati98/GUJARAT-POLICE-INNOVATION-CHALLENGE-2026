import re
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import TokenPayload, get_current_user, require_operator
from app.database import get_db
from app.models.watchlist import VehicleWatchlist
from app.schemas.watchlist import WatchlistCreate, WatchlistResponse, WatchlistUpdate

router = APIRouter(prefix="/watchlist", tags=["Vehicle Watchlist"])

_PLATE_NORMALIZE_RE = re.compile(r'[\s\-]')


def _normalize(plate: str) -> str:
    return _PLATE_NORMALIZE_RE.sub('', plate.upper())


@router.get("", response_model=List[WatchlistResponse])
def list_watchlist(
    active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """List all watchlist entries, optionally filtered by active status."""
    q = db.query(VehicleWatchlist)
    if active is not None:
        q = q.filter(VehicleWatchlist.active == active)
    return [WatchlistResponse.model_validate(w) for w in q.order_by(VehicleWatchlist.tagged_at.desc()).all()]


@router.post("", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
def add_to_watchlist(
    body: WatchlistCreate,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_operator),
):
    """
    Add a plate to the watchlist (normalized to uppercase, no spaces/dashes).
    If the plate already exists (even inactive), reactivate it and update the reason.
    """
    normalized = _normalize(body.plate_text)
    if len(normalized) < 6:
        raise HTTPException(status_code=422, detail="Plate text too short after normalization")

    existing = (
        db.query(VehicleWatchlist)
        .filter(VehicleWatchlist.plate_text == normalized)
        .first()
    )
    if existing:
        existing.active = True
        existing.reason = body.reason or existing.reason
        existing.tagged_by_email = current_user.sub
        db.commit()
        db.refresh(existing)
        return WatchlistResponse.model_validate(existing)

    entry = VehicleWatchlist(
        id=uuid.uuid4(),
        plate_text=normalized,
        reason=body.reason,
        tagged_by_email=current_user.sub,
        active=True,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return WatchlistResponse.model_validate(entry)


@router.get("/{entry_id}", response_model=WatchlistResponse)
def get_watchlist_entry(
    entry_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    entry = db.query(VehicleWatchlist).filter(VehicleWatchlist.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Watchlist entry not found")
    return WatchlistResponse.model_validate(entry)


@router.patch("/{entry_id}", response_model=WatchlistResponse)
def update_watchlist_entry(
    entry_id: uuid.UUID,
    body: WatchlistUpdate,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_operator),
):
    """Update the reason or active status of a watchlist entry."""
    entry = db.query(VehicleWatchlist).filter(VehicleWatchlist.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Watchlist entry not found")

    if body.reason is not None:
        entry.reason = body.reason
    if body.active is not None:
        entry.active = body.active

    db.commit()
    db.refresh(entry)
    return WatchlistResponse.model_validate(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_watchlist_entry(
    entry_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_operator),
):
    """Soft-delete: set active=False (never hard-deletes to preserve audit trail)."""
    entry = db.query(VehicleWatchlist).filter(VehicleWatchlist.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Watchlist entry not found")

    entry.active = False
    db.commit()
