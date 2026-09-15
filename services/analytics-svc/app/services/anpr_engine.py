"""
Two-stage ANPR pipeline:
  Stage 1 — YOLOv8n plate detector (ultralytics, CPU)
  Stage 2 — EasyOCR on cropped plate region

Loaded once on first use (lazy singleton) to avoid re-initialising on every frame.
"""
import logging
import os
import re

import cv2
import numpy as np
import easyocr
from ultralytics import YOLO

from app.config import settings

logger = logging.getLogger(__name__)

INDIAN_PLATE_RE = re.compile(
    r'^[A-Z]{2}[\s\-]?[0-9]{1,2}[\s\-]?[A-Z]{1,3}[\s\-]?[0-9]{1,4}$'
)


def normalize_plate(text: str) -> str:
    """Strip spaces, dashes, uppercase."""
    return re.sub(r'[\s\-]', '', text.upper())


def preprocess_crop(crop_bgr: np.ndarray) -> np.ndarray:
    """Resize → grayscale → CLAHE → denoise for better OCR."""
    h, w = crop_bgr.shape[:2]
    new_w = 300
    new_h = max(int(h * new_w / w), 60)
    resized = cv2.resize(crop_bgr, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    denoised = cv2.fastNlMeansDenoising(enhanced, h=10)
    return denoised


class ANPREngine:
    _instance = None
    _load_failed = False  # avoid hammering on repeated init errors

    def __init__(self):
        from huggingface_hub import hf_hub_download

        logger.info("Downloading YOLO plate detection model from HuggingFace...")
        model_path = hf_hub_download(
            repo_id="keremberke/yolov8n-license-plate-detection",
            filename="best.pt",
            cache_dir=settings.MODELS_CACHE_DIR,
        )
        logger.info(f"Model cached at {model_path}. Loading...")
        self.detector = YOLO(model_path)

        logger.info("Loading EasyOCR (English)...")
        self.reader = easyocr.Reader(
            ['en'],
            gpu=False,
            model_storage_directory=settings.MODELS_CACHE_DIR,
        )
        logger.info("ANPR engine ready.")

    @classmethod
    def get(cls) -> "ANPREngine":
        if cls._load_failed:
            return None
        if cls._instance is None:
            try:
                cls._instance = cls()
            except Exception as e:
                cls._load_failed = True
                logger.error(f"Failed to load ANPR models — ANPR disabled: {e}")
                return None
        return cls._instance

    def detect(self, frame_bgr: np.ndarray) -> list[dict]:
        """
        Run full ANPR pipeline on a frame.
        Returns list of: {plate_text, confidence (OCR), detect_confidence, bbox}
        """
        results = []

        # Stage 1: plate detection
        yolo_results = self.detector.predict(
            frame_bgr,
            conf=settings.ANPR_DETECT_CONF,
            verbose=False,
            device="cpu",
        )

        if not yolo_results or len(yolo_results[0].boxes) == 0:
            return results

        boxes = yolo_results[0].boxes

        for box in boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            detect_conf = float(box.conf[0])

            # Expand bbox slightly for better OCR
            pad = 5
            x1 = max(0, x1 - pad)
            y1 = max(0, y1 - pad)
            x2 = min(frame_bgr.shape[1], x2 + pad)
            y2 = min(frame_bgr.shape[0], y2 + pad)

            crop = frame_bgr[y1:y2, x1:x2]
            if crop.size == 0:
                continue

            # Stage 2: OCR
            processed = preprocess_crop(crop)
            ocr_results = self.reader.readtext(
                processed,
                allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                detail=1,
                paragraph=False,
            )

            for (_, text, ocr_conf) in ocr_results:
                if ocr_conf < settings.ANPR_OCR_CONF:
                    continue
                normalized = normalize_plate(text)
                if len(normalized) < 6:
                    continue
                if not INDIAN_PLATE_RE.match(normalized):
                    continue
                results.append({
                    "plate_text": normalized,
                    "confidence": round(ocr_conf, 4),
                    "detect_confidence": round(detect_conf, 4),
                    "bbox": [x1, y1, x2, y2],
                })

        return results
