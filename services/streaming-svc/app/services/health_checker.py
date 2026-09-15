import subprocess
import asyncio
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.stream import Stream, HealthStatus
from app.database import SessionLocal
from app.config import settings

logger = logging.getLogger(__name__)

def probe_rtsp(rtsp_url: str, timeout_seconds: int = 8) -> bool:
    """Use ffprobe to check if RTSP stream is reachable."""
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "quiet",
                "-rtsp_transport", "tcp",
                "-i", rtsp_url,
                "-show_entries", "format=nb_streams",
                "-of", "default=noprint_wrappers=1",
            ],
            capture_output=True,
            timeout=timeout_seconds,
        )
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        logger.warning(f"Health check timed out for {rtsp_url[:30]}...")
        return False
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return False

async def check_stream_health(stream: Stream, db: Session) -> HealthStatus:
    """Probe stream and update DB record."""
    url = stream.get_main_url()
    is_alive = await asyncio.to_thread(probe_rtsp, url)

    now = datetime.utcnow()
    stream.last_health_check_at = now

    if is_alive:
        stream.health_status = HealthStatus.online
        stream.last_online_at = now
        stream.consecutive_failures = 0
        stream.last_error = None
    else:
        stream.consecutive_failures = (stream.consecutive_failures or 0) + 1
        stream.health_status = HealthStatus.offline
        stream.last_error = f"ffprobe probe failed at {now.isoformat()}"

    db.commit()
    return stream.health_status

async def run_health_checks():
    """Background task: probe all active streams periodically."""
    while True:
        await asyncio.sleep(settings.HEALTH_CHECK_INTERVAL_SECONDS)
        db = SessionLocal()
        try:
            streams = db.query(Stream).filter(Stream.is_active == True).all()
            logger.info(f"Running health checks for {len(streams)} streams")
            for stream in streams:
                try:
                    await check_stream_health(stream, db)
                except Exception as e:
                    logger.error(f"Health check failed for stream {stream.id}: {e}")
        finally:
            db.close()
