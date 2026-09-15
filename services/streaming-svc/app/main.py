import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base
from app.config import settings
from app.routers import streams, live, health

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    with engine.connect() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS streaming"))
        conn.commit()
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Raksha Streaming Service",
    description="RTSP-to-HLS Video Streaming Microservice",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    init_db()
    logger.info("Database initialized")
    asyncio.create_task(_run_health_checks())
    asyncio.create_task(_run_session_cleanup())
    logger.info("Background tasks started")

async def _run_health_checks():
    from app.services.health_checker import run_health_checks
    await run_health_checks()

async def _run_session_cleanup():
    from app.services.session_cleanup import cleanup_inactive_sessions
    await cleanup_inactive_sessions()

app.include_router(streams.router, prefix="/api/v1")
app.include_router(live.router, prefix="/api/v1")
app.include_router(health.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Raksha Streaming Service", "version": "1.0.0", "docs": "/docs"}

@app.get("/ping")
async def ping():
    return {"status": "ok"}
