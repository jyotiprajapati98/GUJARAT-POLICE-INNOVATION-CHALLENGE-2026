"""
CSV Import utility for bulk camera upload.

Expected CSV columns:
    camera_id_label   - Required. Unique human ID (e.g. MCD-TFC-001)
    name              - Required. Camera name/description
    latitude          - Required. WGS84 latitude
    longitude         - Required. WGS84 longitude
    camera_type       - Optional. dome/bullet/ptz/fisheye/box/thermal/other
    status            - Optional. active/inactive/faulty/under_maintenance/decommissioned/planned
    address           - Optional.
    area              - Optional.
    zone              - Optional.
    ward              - Optional.
    district          - Optional.
    city              - Optional.
    state             - Optional.
    pincode           - Optional.
    make              - Optional. Brand name
    model_number      - Optional.
    resolution        - Optional. e.g. 1080p, 4K
    serial_number     - Optional.
    network_type      - Optional. wired/wifi/4g/5g/fiber/other
    storage_type      - Optional. local/nvr/dvr/cloud/hybrid
    retention_period_days - Optional. Integer
    has_night_vision  - Optional. true/false
    is_ptz            - Optional. true/false
    has_analytics     - Optional. true/false
    remarks           - Optional.
"""

import io
import uuid
from typing import Tuple, List, Dict, Any
import pandas as pd
from app.models.camera import CameraType, CameraStatus, NetworkType, StorageType


def _parse_bool(val) -> bool:
    if pd.isna(val):
        return False
    if isinstance(val, bool):
        return val
    return str(val).strip().lower() in ("true", "1", "yes", "y")


def _parse_optional_str(val) -> str | None:
    if pd.isna(val):
        return None
    s = str(val).strip()
    return s if s else None


def _parse_optional_int(val) -> int | None:
    if pd.isna(val):
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def _parse_optional_float(val) -> float | None:
    if pd.isna(val):
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _validate_enum(val, enum_class, field_name: str) -> Tuple[Any, str | None]:
    if pd.isna(val) or str(val).strip() == "":
        return None, None
    s = str(val).strip().lower()
    valid_values = [e.value for e in enum_class]
    if s in valid_values:
        return s, None
    return None, f"Invalid {field_name}: '{val}'. Must be one of: {valid_values}"


def parse_camera_csv(
    file_content: bytes,
    department_id: uuid.UUID,
    created_by_id: uuid.UUID,
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse CSV file content and return (valid_records, errors).

    Each valid record is a dict ready to insert into the cameras table.
    Errors is a list of human-readable error strings with row numbers.
    """
    valid_records: List[Dict[str, Any]] = []
    errors: List[str] = []

    try:
        df = pd.read_csv(io.BytesIO(file_content))
    except Exception as e:
        return [], [f"Failed to parse CSV: {str(e)}"]

    required_cols = {"camera_id_label", "name", "latitude", "longitude"}
    missing_required = required_cols - set(df.columns)
    if missing_required:
        return [], [f"Missing required columns: {missing_required}"]

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-based with header row
        row_errors = []

        # Required fields
        camera_id_label = _parse_optional_str(row.get("camera_id_label"))
        if not camera_id_label:
            row_errors.append(f"Row {row_num}: camera_id_label is required")

        name = _parse_optional_str(row.get("name"))
        if not name:
            row_errors.append(f"Row {row_num}: name is required")

        latitude = _parse_optional_float(row.get("latitude"))
        if latitude is None:
            row_errors.append(f"Row {row_num}: latitude is required and must be numeric")
        elif not (-90 <= latitude <= 90):
            row_errors.append(f"Row {row_num}: latitude must be between -90 and 90")

        longitude = _parse_optional_float(row.get("longitude"))
        if longitude is None:
            row_errors.append(f"Row {row_num}: longitude is required and must be numeric")
        elif not (-180 <= longitude <= 180):
            row_errors.append(f"Row {row_num}: longitude must be between -180 and 180")

        # Enum fields
        camera_type_val, cam_err = _validate_enum(row.get("camera_type", "dome"), CameraType, "camera_type")
        if cam_err:
            row_errors.append(f"Row {row_num}: {cam_err}")

        status_val, stat_err = _validate_enum(row.get("status", "active"), CameraStatus, "status")
        if stat_err:
            row_errors.append(f"Row {row_num}: {stat_err}")

        network_type_val, net_err = _validate_enum(row.get("network_type"), NetworkType, "network_type")
        if net_err:
            row_errors.append(f"Row {row_num}: {net_err}")

        storage_type_val, store_err = _validate_enum(row.get("storage_type"), StorageType, "storage_type")
        if store_err:
            row_errors.append(f"Row {row_num}: {store_err}")

        if row_errors:
            errors.extend(row_errors)
            continue

        # Build the WKT geometry string
        wkt_point = f"POINT({longitude} {latitude})"

        record = {
            "id": uuid.uuid4(),
            "camera_id_label": camera_id_label,
            "name": name,
            "latitude": latitude,
            "longitude": longitude,
            "location": wkt_point,
            "department_id": department_id,
            "created_by_id": created_by_id,
            "updated_by_id": created_by_id,
            "camera_type": camera_type_val or "dome",
            "status": status_val or "active",
            "network_type": network_type_val,
            "storage_type": storage_type_val,
            "serial_number": _parse_optional_str(row.get("serial_number")),
            "address": _parse_optional_str(row.get("address")),
            "area": _parse_optional_str(row.get("area")),
            "zone": _parse_optional_str(row.get("zone")),
            "ward": _parse_optional_str(row.get("ward")),
            "district": _parse_optional_str(row.get("district")),
            "city": _parse_optional_str(row.get("city")),
            "state": _parse_optional_str(row.get("state")),
            "pincode": _parse_optional_str(row.get("pincode")),
            "make": _parse_optional_str(row.get("make")),
            "model_number": _parse_optional_str(row.get("model_number")),
            "resolution": _parse_optional_str(row.get("resolution")),
            "retention_period_days": _parse_optional_int(row.get("retention_period_days")),
            "has_night_vision": _parse_bool(row.get("has_night_vision", False)),
            "is_ptz": _parse_bool(row.get("is_ptz", False)),
            "has_analytics": _parse_bool(row.get("has_analytics", False)),
            "remarks": _parse_optional_str(row.get("remarks")),
            "is_active": True,
            "connectivity_status": True,
        }
        valid_records.append(record)

    return valid_records, errors
