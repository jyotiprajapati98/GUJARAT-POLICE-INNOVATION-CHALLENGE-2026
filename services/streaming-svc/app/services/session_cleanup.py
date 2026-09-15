import asyncio
import logging
from datetime import datetime, timedelta
from app.models.session import StreamSession, SessionStatus
from app.database import SessionLocal
from app.services.ffmpeg_manager import ffmpeg_manager
from app.config import settings

logger = logging.getLogger(__name__)

async def cleanup_inactive_sessions():
    """Background task: stop sessions with no heartbeat for > SESSION_TIMEOUT_SECONDS."""
    while True:
        await asyncio.sleep(30)
        db = SessionLocal()
        try:
            cutoff = datetime.utcnow() - timedelta(seconds=settings.SESSION_TIMEOUT_SECONDS)
            stale = db.query(StreamSession).filter(
                StreamSession.status == SessionStatus.active,
                StreamSession.last_heartbeat_at < cutoff,
            ).all()

            for session in stale:
                logger.info(f"Cleaning up stale session {session.id}")
                sid = str(session.id)
                ffmpeg_manager.stop_stream(sid)
                ffmpeg_manager.cleanup_hls(sid, settings.HLS_DIR)
                session.status = SessionStatus.ended
                session.ended_at = datetime.utcnow()

            if stale:
                db.commit()
                logger.info(f"Cleaned up {len(stale)} stale sessions")
        except Exception as e:
            logger.error(f"Session cleanup error: {e}")
        finally:
            db.close()
