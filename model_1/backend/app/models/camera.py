import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, Date, Float, Integer, Enum, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.database import Base


class CameraType(str, enum.Enum):
    dome = "dome"
    bullet = "bullet"
    ptz = "ptz"
    fisheye = "fisheye"
    box = "box"
    thermal = "thermal"
    other = "other"


class CameraStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    faulty = "faulty"
    under_maintenance = "under_maintenance"
    decommissioned = "decommissioned"
    planned = "planned"


class NetworkType(str, enum.Enum):
    wired = "wired"
    wifi = "wifi"
    four_g = "4g"
    five_g = "5g"
    fiber = "fiber"
    other = "other"


class StorageType(str, enum.Enum):
    local = "local"
    nvr = "nvr"
    dvr = "dvr"
    cloud = "cloud"
    hybrid = "hybrid"


class MountingType(str, enum.Enum):
    pole = "pole"
    wall = "wall"
    ceiling = "ceiling"
    tower = "tower"
    gantry = "gantry"
    other = "other"


class LocationType(str, enum.Enum):
    indoor = "indoor"
    outdoor = "outdoor"


class CoverageType(str, enum.Enum):
    traffic = "traffic"
    public_space = "public_space"
    building_entrance = "building_entrance"
    parking = "parking"
    highway = "highway"
    railway = "railway"
    airport = "airport"
    other = "other"


class Camera(Base):
    __tablename__ = "cameras"

    # IDENTIFICATION
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camera_id_label = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    serial_number = Column(String(200), nullable=True)
    asset_tag = Column(String(100), unique=True, nullable=True)

    # LOCATION
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(Text, nullable=True)
    area = Column(String(200), nullable=True)
    zone = Column(String(100), nullable=True)
    ward = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    landmark = Column(Text, nullable=True)
    location_type = Column(Enum(LocationType), default=LocationType.outdoor)
    installation_height_m = Column(Float, nullable=True)
    mounting_type = Column(Enum(MountingType), nullable=True)

    # OWNERSHIP
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)
    sub_department = Column(String(200), nullable=True)
    owner_name = Column(String(200), nullable=True)
    owner_contact = Column(String(200), nullable=True)
    vendor_name = Column(String(200), nullable=True)
    contractor_name = Column(String(200), nullable=True)
    procurement_date = Column(Date, nullable=True)
    installation_date = Column(Date, nullable=True)
    warranty_expiry_date = Column(Date, nullable=True)
    amc_expiry_date = Column(Date, nullable=True)

    # TECHNICAL SPECS
    camera_type = Column(Enum(CameraType), default=CameraType.dome)
    make = Column(String(200), nullable=True)
    model_number = Column(String(200), nullable=True)
    resolution = Column(String(50), nullable=True)
    resolution_megapixels = Column(Float, nullable=True)
    field_of_view_degrees = Column(Float, nullable=True)
    has_night_vision = Column(Boolean, default=False)
    ir_range_m = Column(Float, nullable=True)
    weather_rating = Column(String(20), nullable=True)
    vandal_rating = Column(String(20), nullable=True)
    optical_zoom = Column(String(50), nullable=True)
    digital_zoom = Column(String(50), nullable=True)
    frame_rate_fps = Column(Integer, nullable=True)
    sensor_type = Column(String(50), nullable=True)
    sensor_size = Column(String(50), nullable=True)
    has_audio = Column(Boolean, default=False)
    is_ptz = Column(Boolean, default=False)
    compression_format = Column(String(50), nullable=True)

    # COVERAGE
    coverage_radius_m = Column(Float, nullable=True)
    coverage_direction_azimuth = Column(Float, nullable=True)
    coverage_area_sqm = Column(Float, nullable=True)
    coverage_area_description = Column(Text, nullable=True)
    coverage_type = Column(Enum(CoverageType), nullable=True)

    # CONNECTIVITY
    ip_address = Column(String(50), nullable=True)
    mac_address = Column(String(50), nullable=True)
    network_type = Column(Enum(NetworkType), nullable=True)
    isp_provider = Column(String(200), nullable=True)
    bandwidth_mbps = Column(Float, nullable=True)
    stream_protocol = Column(String(50), nullable=True)
    port_number = Column(Integer, nullable=True)
    nvr_dvr_id = Column(String(100), nullable=True)
    nvr_dvr_location = Column(String(200), nullable=True)
    vms_platform = Column(String(200), nullable=True)

    # STORAGE
    storage_type = Column(Enum(StorageType), nullable=True)
    storage_capacity_tb = Column(Float, nullable=True)
    retention_period_days = Column(Integer, nullable=True)
    storage_vendor = Column(String(200), nullable=True)
    cloud_storage_provider = Column(String(200), nullable=True)

    # ANALYTICS
    has_analytics = Column(Boolean, default=False)
    analytics_types = Column(String(500), nullable=True)
    analytics_vendor = Column(String(200), nullable=True)
    analytics_platform = Column(String(200), nullable=True)

    # STATUS & MAINTENANCE
    status = Column(Enum(CameraStatus), default=CameraStatus.active)
    connectivity_status = Column(Boolean, default=True)
    last_checked_at = Column(DateTime, nullable=True)
    last_maintenance_at = Column(DateTime, nullable=True)
    next_maintenance_due = Column(Date, nullable=True)
    fault_description = Column(Text, nullable=True)
    uptime_percentage = Column(Float, nullable=True)

    # AUDIT
    remarks = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # RELATIONSHIPS
    department = relationship("Department", back_populates="cameras", foreign_keys=[department_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])
