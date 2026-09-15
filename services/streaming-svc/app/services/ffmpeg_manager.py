import subprocess
import os
import shutil
import logging
import signal
from typing import Dict

logger = logging.getLogger(__name__)

class FFmpegManager:
    """Manages FFmpeg processes for RTSP-to-HLS transcoding."""

    def __init__(self):
        self._processes: Dict[str, subprocess.Popen] = {}

    def start_stream(self, session_id: str, rtsp_url: str, hls_dir: str) -> int:
        """Start FFmpeg RTSP→HLS for the given session. Returns PID."""
        os.makedirs(hls_dir, exist_ok=True)

        playlist_path = os.path.join(hls_dir, "stream.m3u8")
        segment_pattern = os.path.join(hls_dir, "seg%03d.ts")

        cmd = [
            "ffmpeg",
            "-loglevel", "warning",
            "-rtsp_transport", "tcp",
            "-i", rtsp_url,
            "-c:v", "copy",         # copy video codec (no re-encode = fast)
            "-an",                   # drop audio (simplifies streaming)
            "-f", "hls",
            "-hls_time", "2",        # 2-second segments
            "-hls_list_size", "5",   # keep last 5 segments in playlist
            "-hls_flags", "delete_segments+append_list",
            "-hls_segment_filename", segment_pattern,
            playlist_path,
        ]

        logger.info(f"Starting FFmpeg for session {session_id}")
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            preexec_fn=os.setsid,
        )
        self._processes[session_id] = process
        logger.info(f"FFmpeg started with PID {process.pid} for session {session_id}")
        return process.pid

    def stop_stream(self, session_id: str) -> None:
        """Terminate FFmpeg process and clean up HLS files."""
        process = self._processes.pop(session_id, None)
        if process:
            try:
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                process.wait(timeout=5)
            except Exception as e:
                logger.warning(f"Error stopping FFmpeg for {session_id}: {e}")
                try:
                    process.kill()
                except Exception:
                    pass
            logger.info(f"FFmpeg stopped for session {session_id}")

    def cleanup_hls(self, session_id: str, hls_base_dir: str) -> None:
        """Remove HLS segment files for this session."""
        hls_dir = os.path.join(hls_base_dir, session_id)
        if os.path.exists(hls_dir):
            shutil.rmtree(hls_dir, ignore_errors=True)

    def is_running(self, session_id: str) -> bool:
        proc = self._processes.get(session_id)
        if proc is None:
            return False
        return proc.poll() is None

    def get_all_active(self) -> list:
        return [sid for sid, proc in self._processes.items() if proc.poll() is None]

# Singleton used across the app
ffmpeg_manager = FFmpegManager()
