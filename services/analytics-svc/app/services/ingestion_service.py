"""
Per-camera ingestion: OpenCV captures 1fps from RTSP for ANPR,
FFmpeg records 5-second .ts chunks to local storage.
"""
import asyncio
import logging
import os
import re
import subprocess
import uuid
from datetime import datetime
from typing import Dict, Optional

import cv2

from app.config import settings
from app.database import SessionLocal
from app.models.ingestion_worker import IngestionWorker, WorkerStatus
from app.services.frame_pipeline import process_frame

logger = logging.getLogger(__name__)


def _mask_url(url: str) -> str:
    return re.sub(r'(rtsp://)[^@]+@', r'\1****@', url)


def _run_anpr(frame, frame_path: str) -> list[dict]:
    """Blocking ANPR call — run in thread pool."""
    try:
        from app.services.anpr_engine import ANPREngine
        engine = ANPREngine.get()
        if engine is None:
            return []
        return engine.detect(frame)
    except Exception as e:
        logger.error(f"ANPR error: {e}")
        return []


class CameraWorker:
    def __init__(
        self,
        worker_id: str,
        camera_id: str,
        camera_id_label: str,
        rtsp_url: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_name: Optional[str] = None,
    ):
        self.worker_id = worker_id
        self.camera_id = camera_id
        self.camera_id_label = camera_id_label
        self.rtsp_url = rtsp_url
        self.latitude = latitude
        self.longitude = longitude
        self.location_name = location_name
        self.is_running = False
        self.recording_process: Optional[subprocess.Popen] = None
        self.task: Optional[asyncio.Task] = None
        self.frames_processed = 0
        self.detections_count = 0

    def start_recording(self):
        """FFmpeg: RTSP → 5-second .ts segments."""
        rec_dir = os.path.join(settings.RECORDINGS_DIR, self.camera_id)
        os.makedirs(rec_dir, exist_ok=True)

        cmd = [
            "ffmpeg", "-loglevel", "warning",
            "-rtsp_transport", "tcp",
            "-i", self.rtsp_url,
            "-c:v", "copy",
            "-f", "segment",
            "-segment_time", "5",
            "-segment_format", "mpegts",
            "-strftime", "1",
            os.path.join(rec_dir, "%Y%m%d_%H%M%S.ts"),
        ]
        self.recording_process = subprocess.Popen(
            cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        logger.info(
            f"Recording started for camera {self.camera_id_label} "
            f"(PID {self.recording_process.pid})"
        )

    def stop_recording(self):
        if self.recording_process and self.recording_process.poll() is None:
            self.recording_process.terminate()
            try:
                self.recording_process.wait(timeout=5)
            except Exception:
                self.recording_process.kill()

    async def run(self):
        """OpenCV loop: capture 1fps, process each frame."""
        self.is_running = True
        self.start_recording()

        logger.info(f"ANPR worker started for {self.camera_id_label}")

        cap = None
        consecutive_failures = 0
        MAX_FAILURES = 10

        while self.is_running:
            try:
                if cap is None or not cap.isOpened():
                    logger.info(f"Connecting to {_mask_url(self.rtsp_url)}")
                    cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    if not cap.isOpened():
                        consecutive_failures += 1
                        logger.warning(
                            f"Cannot open stream for {self.camera_id_label} "
                            f"(attempt {consecutive_failures})"
                        )
                        if consecutive_failures >= MAX_FAILURES:
                            await self._update_status(
                                WorkerStatus.crashed, "Cannot connect to RTSP stream"
                            )
                            break
                        await asyncio.sleep(5)
                        continue
                    consecutive_failures = 0

                ret, frame = cap.read()
                if not ret:
                    consecutive_failures += 1
                    if consecutive_failures >= MAX_FAILURES:
                        cap.release()
                        cap = None
                    await asyncio.sleep(1)
                    continue

                consecutive_failures = 0
                self.frames_processed += 1

                # Save frame
                timestamp = datetime.utcnow()
                frame_dir = os.path.join(settings.FRAMES_DIR, self.camera_id)
                os.makedirs(frame_dir, exist_ok=True)
                frame_path = os.path.join(
                    frame_dir, f"{timestamp.strftime('%Y%m%d_%H%M%S')}.jpg"
                )
                cv2.imwrite(frame_path, frame)

                # Run ANPR in thread pool (blocking call)
                detections = await asyncio.to_thread(_run_anpr, frame, frame_path)
                self.detections_count += len(detections)

                # Save events
                for det in detections:
                    await process_frame(
                        camera_id=self.camera_id,
                        camera_id_label=self.camera_id_label,
                        plate_text=det["plate_text"],
                        confidence=det["confidence"],
                        detect_confidence=det["detect_confidence"],
                        detected_at=timestamp,
                        frame_path=frame_path,
                        latitude=self.latitude,
                        longitude=self.longitude,
                        location_name=self.location_name,
                    )

                await self._heartbeat()
                # Wait 1 second before next frame (1fps)
                await asyncio.sleep(1)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker error for {self.camera_id_label}: {e}")
                await asyncio.sleep(2)

        if cap:
            cap.release()
        self.stop_recording()
        self.is_running = False
        logger.info(f"Worker stopped for {self.camera_id_label}")

    async def _heartbeat(self):
        db = SessionLocal()
        try:
            worker = (
                db.query(IngestionWorker)
                .filter(IngestionWorker.id == self.worker_id)
                .first()
            )
            if worker:
                worker.last_heartbeat = datetime.utcnow()
                worker.frames_processed = self.frames_processed
                worker.detections_count = self.detections_count
                db.commit()
        finally:
            db.close()

    async def _update_status(self, status: WorkerStatus, error: str = None):
        db = SessionLocal()
        try:
            worker = (
                db.query(IngestionWorker)
                .filter(IngestionWorker.id == self.worker_id)
                .first()
            )
            if worker:
                worker.status = status
                if error:
                    worker.error_message = error
                db.commit()
        finally:
            db.close()


class IngestionService:
    """Singleton managing all active camera workers."""

    def __init__(self):
        self._workers: Dict[str, CameraWorker] = {}  # worker_id → CameraWorker

    async def start_worker(
        self,
        worker_id: str,
        camera_id: str,
        camera_id_label: str,
        rtsp_url: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_name: Optional[str] = None,
    ) -> CameraWorker:
        if worker_id in self._workers:
            raise ValueError(f"Worker {worker_id} already running")

        worker = CameraWorker(
            worker_id=worker_id,
            camera_id=camera_id,
            camera_id_label=camera_id_label,
            rtsp_url=rtsp_url,
            latitude=latitude,
            longitude=longitude,
            location_name=location_name,
        )
        self._workers[worker_id] = worker
        worker.task = asyncio.create_task(worker.run())
        return worker

    async def stop_worker(self, worker_id: str):
        worker = self._workers.pop(worker_id, None)
        if worker:
            worker.is_running = False
            if worker.task:
                worker.task.cancel()
                try:
                    await worker.task
                except asyncio.CancelledError:
                    pass
            worker.stop_recording()

    def get_worker(self, worker_id: str) -> Optional[CameraWorker]:
        return self._workers.get(worker_id)

    def list_workers(self) -> list[str]:
        return list(self._workers.keys())

    def is_running(self, worker_id: str) -> bool:
        w = self._workers.get(worker_id)
        return w is not None and w.is_running


ingestion_service = IngestionService()
