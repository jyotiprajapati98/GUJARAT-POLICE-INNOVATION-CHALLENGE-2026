"""
ANPR pipeline — two-stage:

  Stage 1: YOLOv8n (COCO, auto-downloads from ultralytics CDN ~6MB)
           Detects vehicles (car / motorcycle / bus / truck)
           Crops the bottom-center of each vehicle bbox — plate region

  Stage 2: EasyOCR on the cropped plate area with CLAHE preprocessing

Indian plate regex filters out any non-plate text.
~150-250ms per frame on CPU.
"""
import logging
import re

import cv2
import numpy as np
import easyocr
from ultralytics import YOLO

from app.config import settings

logger = logging.getLogger(__name__)

# COCO classes that can carry a license plate
VEHICLE_CLASSES = {2, 3, 5, 7}  # car, motorcycle, bus, truck

# Accept any plate format — Indian, BH series, foreign
# Rules: 4–12 chars, uppercase alphanumeric, must contain at least one letter AND one digit
_ALNUM = re.compile(r'^[A-Z0-9]{4,12}$')


def _is_valid_plate(text: str) -> bool:
    if not _ALNUM.match(text):
        return False
    has_letter = any(c.isalpha() for c in text)
    has_digit = any(c.isdigit() for c in text)
    return has_letter and has_digit


def normalize_plate(text: str) -> str:
    return re.sub(r'[\s\-\.]', '', text.upper())


def _plate_crop(frame_bgr: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> np.ndarray:
    """
    Crop the bottom-center third of a vehicle bbox — where plates are mounted.
    Expand horizontally slightly so we don't clip the plate edges.
    """
    h = y2 - y1
    w = x2 - x1
    # Bottom 35% of the vehicle height
    crop_y1 = y1 + int(h * 0.65)
    crop_y2 = y2
    # Center 80% of the width
    pad_x = int(w * 0.10)
    crop_x1 = max(0, x1 + pad_x)
    crop_x2 = min(frame_bgr.shape[1], x2 - pad_x)
    return frame_bgr[crop_y1:crop_y2, crop_x1:crop_x2]


def _preprocess(crop_bgr: np.ndarray) -> np.ndarray:
    """Resize to fixed width → grayscale → CLAHE → denoise."""
    h, w = crop_bgr.shape[:2]
    new_w = 320
    new_h = max(int(h * new_w / w), 60)
    resized = cv2.resize(crop_bgr, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    return cv2.fastNlMeansDenoising(enhanced, h=10)


class ANPREngine:
    _instance = None

    def __init__(self):
        logger.info("Loading YOLOv8n vehicle detector (auto-download ~6MB if not cached)...")
        # yolov8n.pt is hosted on ultralytics CDN — always available, no auth needed
        self.detector = YOLO("yolov8n.pt")
        logger.info("Loading EasyOCR (English)...")
        self.reader = easyocr.Reader(
            ['en'],
            gpu=False,
            model_storage_directory=settings.MODELS_CACHE_DIR,
        )
        logger.info("ANPR engine ready (vehicle crop → EasyOCR).")

    @classmethod
    def get(cls) -> "ANPREngine":
        if cls._instance is None:
            try:
                cls._instance = cls()
            except Exception as e:
                logger.error(f"ANPR engine init failed: {e}")
        return cls._instance

    def detect(self, frame_bgr: np.ndarray) -> list[dict]:
        """
        Returns list of dicts:
          plate_text, confidence, detect_confidence, bbox (vehicle box)
        """
        results = []

        # Resize large frames before YOLO — keeps inference fast
        h, w = frame_bgr.shape[:2]
        scale = 1.0
        if w > 1280:
            scale = 1280 / w
            frame_bgr = cv2.resize(frame_bgr, (1280, int(h * scale)), interpolation=cv2.INTER_AREA)

        yolo_out = self.detector.predict(
            frame_bgr,
            conf=0.35,          # low threshold — better recall for far/partial vehicles
            classes=list(VEHICLE_CLASSES),
            verbose=False,
            device="cpu",
        )

        if not yolo_out or len(yolo_out[0].boxes) == 0:
            return results

        for box in yolo_out[0].boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            detect_conf = float(box.conf[0])

            # Skip tiny detections — too small to have a readable plate
            if (x2 - x1) < 60 or (y2 - y1) < 40:
                continue

            crop = _plate_crop(frame_bgr, x1, y1, x2, y2)
            if crop.size == 0:
                continue

            processed = _preprocess(crop)

            ocr_out = self.reader.readtext(
                processed,
                allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                detail=1,
                paragraph=False,
            )

            for (_, text, ocr_conf) in ocr_out:
                if ocr_conf < settings.ANPR_OCR_CONF:
                    continue
                normalized = normalize_plate(text)
                if not _is_valid_plate(normalized):
                    continue
                results.append({
                    "plate_text": normalized,
                    "confidence": round(ocr_conf, 4),
                    "detect_confidence": round(detect_conf, 4),
                    "bbox": [x1, y1, x2, y2],
                    "scale": scale,
                })

        return results
