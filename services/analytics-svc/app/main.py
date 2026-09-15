import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, SessionLocal
from app.models.alert import Alert  # noqa: F401 — ensure table is registered before create_all
from app.models.anpr_event import ANPREvent  # noqa: F401
from app.models.ingestion_worker import IngestionWorker  # noqa: F401
from app.models.watchlist import VehicleWatchlist  # noqa: F401
from app.routers import alerts, anpr, vehicles, watchlist, workers
from app.ws.manager import manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Raksha Analytics Service",
    description="ANPR, Event Tagging, Watchlist, and Alert Service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    logger.info("Initialising database schema...")
    init_db()
    logger.info("Database ready.")


# ── API routers ────────────────────────────────────────────────────────────────
app.include_router(workers.router, prefix="/api/v1")
app.include_router(anpr.router, prefix="/api/v1")
app.include_router(watchlist.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(vehicles.router, prefix="/api/v1")


# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """
    Real-time alert stream.
    On connect: sends the last 5 unacknowledged alerts as initial state.
    Afterwards: new alerts are pushed by manager.broadcast() from frame_pipeline.
    Client should send periodic pings (any text) to keep the connection alive.
    """
    await manager.connect(websocket)

    # Push recent unacknowledged alerts on connect
    db = SessionLocal()
    try:
        recent = (
            db.query(Alert)
            .filter(Alert.acknowledged == False)
            .order_by(Alert.triggered_at.desc())
            .limit(5)
            .all()
        )
        for a in recent:
            await websocket.send_json({
                "type": "alert",
                "alert_id": str(a.id),
                "plate_text": a.plate_text,
                "camera_id_label": a.camera_id_label,
                "location_name": a.location_name or "",
                "latitude": a.latitude,
                "longitude": a.longitude,
                "triggered_at": a.triggered_at.isoformat(),
                "acknowledged": False,
            })
    except Exception as exc:
        logger.error(f"Failed to send initial alerts: {exc}")
    finally:
        db.close()

    try:
        while True:
            # Keep the connection alive; client sends pings as plain text
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ── Health endpoints ───────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Raksha Analytics Service",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/ping", tags=["Health"])
async def ping():
    return {"status": "ok"}
