from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime, date
import uuid
from app.models.camera import (
    CameraType, CameraStatus, NetworkType, StorageType,
    MountingType, LocationType, CoverageType
)


class CameraCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    # IDENTIFICATION
    camera_id_label: str
    name: str
    serial_number: Optional[str] = None
    asset_tag: Optional[str] = None

    # LOCATION
    latitude: float
    longitude: float
    address: Optional[str] = None
    area: Optional[str] = None
    zone: Optional[str] = None
    ward: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    landmark: Optional[str] = None
    location_type: Optional[LocationType] = LocationType.outdoor
    installation_height_m: Optional[float] = None
    mounting_type: Optional[MountingType] = None

    # OWNERSHIP
    department_id: uuid.UUID
    sub_department: Optional[str] = None
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None
    vendor_name: Optional[str] = None
    contractor_name: Optional[str] = None
    procurement_date: Optional[date] = None
    installation_date: Optional[date] = None
    warranty_expiry_date: Optional[date] = None
    amc_expiry_date: Optional[date] = None

    # TECHNICAL SPECS
    camera_type: Optional[CameraType] = CameraType.dome
    make: Optional[str] = None
    model_number: Optional[str] = None
    resolution: Optional[str] = None
    resolution_megapixels: Optional[float] = None
    field_of_view_degrees: Optional[float] = None
    has_night_vision: Optional[bool] = False
    ir_range_m: Optional[float] = None
    weather_rating: Optional[str] = None
    vandal_rating: Optional[str] = None
    optical_zoom: Optional[str] = None
    digital_zoom: Optional[str] = None
    frame_rate_fps: Optional[int] = None
    sensor_type: Optional[str] = None
    sensor_size: Optional[str] = None
    has_audio: Optional[bool] = False
    is_ptz: Optional[bool] = False
    compression_format: Optional[str] = None

    # COVERAGE
    coverage_radius_m: Optional[float] = None
    coverage_direction_azimuth: Optional[float] = None
    coverage_area_sqm: Optional[float] = None
    coverage_area_description: Optional[str] = None
    coverage_type: Optional[CoverageType] = None

    # CONNECTIVITY
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    network_type: Optional[NetworkType] = None
    isp_provider: Optional[str] = None
    bandwidth_mbps: Optional[float] = None
    stream_protocol: Optional[str] = None
    port_number: Optional[int] = None
    nvr_dvr_id: Optional[str] = None
    nvr_dvr_location: Optional[str] = None
    vms_platform: Optional[str] = None

    # STORAGE
    storage_type: Optional[StorageType] = None
    storage_capacity_tb: Optional[float] = None
    retention_period_days: Optional[int] = None
    storage_vendor: Optional[str] = None
    cloud_storage_provider: Optional[str] = None

    # ANALYTICS
    has_analytics: Optional[bool] = False
    analytics_types: Optional[str] = None
    analytics_vendor: Optional[str] = None
    analytics_platform: Optional[str] = None

    # STATUS
    status: Optional[CameraStatus] = CameraStatus.active
    connectivity_status: Optional[bool] = True
    last_checked_at: Optional[datetime] = None
    last_maintenance_at: Optional[datetime] = None
    next_maintenance_due: Optional[date] = None
    fault_description: Optional[str] = None
    uptime_percentage: Optional[float] = None
    remarks: Optional[str] = None


class CameraUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    camera_id_label: Optional[str] = None
    name: Optional[str] = None
    serial_number: Optional[str] = None
    asset_tag: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    area: Optional[str] = None
    zone: Optional[str] = None
    ward: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    landmark: Optional[str] = None
    location_type: Optional[LocationType] = None
    installation_height_m: Optional[float] = None
    mounting_type: Optional[MountingType] = None
    department_id: Optional[uuid.UUID] = None
    sub_department: Optional[str] = None
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None
    vendor_name: Optional[str] = None
    contractor_name: Optional[str] = None
    procurement_date: Optional[date] = None
    installation_date: Optional[date] = None
    warranty_expiry_date: Optional[date] = None
    amc_expiry_date: Optional[date] = None
    camera_type: Optional[CameraType] = None
    make: Optional[str] = None
    model_number: Optional[str] = None
    resolution: Optional[str] = None
    resolution_megapixels: Optional[float] = None
    field_of_view_degrees: Optional[float] = None
    has_night_vision: Optional[bool] = None
    ir_range_m: Optional[float] = None
    weather_rating: Optional[str] = None
    vandal_rating: Optional[str] = None
    optical_zoom: Optional[str] = None
    digital_zoom: Optional[str] = None
    frame_rate_fps: Optional[int] = None
    sensor_type: Optional[str] = None
    sensor_size: Optional[str] = None
    has_audio: Optional[bool] = None
    is_ptz: Optional[bool] = None
    compression_format: Optional[str] = None
    coverage_radius_m: Optional[float] = None
    coverage_direction_azimuth: Optional[float] = None
    coverage_area_sqm: Optional[float] = None
    coverage_area_description: Optional[str] = None
    coverage_type: Optional[CoverageType] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    network_type: Optional[NetworkType] = None
    isp_provider: Optional[str] = None
    bandwidth_mbps: Optional[float] = None
    stream_protocol: Optional[str] = None
    port_number: Optional[int] = None
    nvr_dvr_id: Optional[str] = None
    nvr_dvr_location: Optional[str] = None
    vms_platform: Optional[str] = None
    storage_type: Optional[StorageType] = None
    storage_capacity_tb: Optional[float] = None
    retention_period_days: Optional[int] = None
    storage_vendor: Optional[str] = None
    cloud_storage_provider: Optional[str] = None
    has_analytics: Optional[bool] = None
    analytics_types: Optional[str] = None
    analytics_vendor: Optional[str] = None
    analytics_platform: Optional[str] = None
    status: Optional[CameraStatus] = None
    connectivity_status: Optional[bool] = None
    last_checked_at: Optional[datetime] = None
    last_maintenance_at: Optional[datetime] = None
    next_maintenance_due: Optional[date] = None
    fault_description: Optional[str] = None
    uptime_percentage: Optional[float] = None
    remarks: Optional[str] = None
    is_active: Optional[bool] = None


class CameraResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: uuid.UUID
    camera_id_label: str
    name: str
    serial_number: Optional[str] = None
    asset_tag: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    area: Optional[str] = None
    zone: Optional[str] = None
    ward: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    landmark: Optional[str] = None
    location_type: Optional[LocationType] = None
    installation_height_m: Optional[float] = None
    mounting_type: Optional[MountingType] = None
    department_id: uuid.UUID
    department_name: Optional[str] = None
    sub_department: Optional[str] = None
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None
    vendor_name: Optional[str] = None
    contractor_name: Optional[str] = None
    procurement_date: Optional[date] = None
    installation_date: Optional[date] = None
    warranty_expiry_date: Optional[date] = None
    amc_expiry_date: Optional[date] = None
    camera_type: Optional[CameraType] = None
    make: Optional[str] = None
    model_number: Optional[str] = None
    resolution: Optional[str] = None
    resolution_megapixels: Optional[float] = None
    field_of_view_degrees: Optional[float] = None
    has_night_vision: bool = False
    ir_range_m: Optional[float] = None
    weather_rating: Optional[str] = None
    vandal_rating: Optional[str] = None
    optical_zoom: Optional[str] = None
    digital_zoom: Optional[str] = None
    frame_rate_fps: Optional[int] = None
    sensor_type: Optional[str] = None
    sensor_size: Optional[str] = None
    has_audio: bool = False
    is_ptz: bool = False
    compression_format: Optional[str] = None
    coverage_radius_m: Optional[float] = None
    coverage_direction_azimuth: Optional[float] = None
    coverage_area_sqm: Optional[float] = None
    coverage_area_description: Optional[str] = None
    coverage_type: Optional[CoverageType] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    network_type: Optional[NetworkType] = None
    isp_provider: Optional[str] = None
    bandwidth_mbps: Optional[float] = None
    stream_protocol: Optional[str] = None
    port_number: Optional[int] = None
    nvr_dvr_id: Optional[str] = None
    nvr_dvr_location: Optional[str] = None
    vms_platform: Optional[str] = None
    storage_type: Optional[StorageType] = None
    storage_capacity_tb: Optional[float] = None
    retention_period_days: Optional[int] = None
    storage_vendor: Optional[str] = None
    cloud_storage_provider: Optional[str] = None
    has_analytics: bool = False
    analytics_types: Optional[str] = None
    analytics_vendor: Optional[str] = None
    analytics_platform: Optional[str] = None
    status: Optional[CameraStatus] = None
    connectivity_status: bool = True
    last_checked_at: Optional[datetime] = None
    last_maintenance_at: Optional[datetime] = None
    next_maintenance_due: Optional[date] = None
    fault_description: Optional[str] = None
    uptime_percentage: Optional[float] = None
    remarks: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class CameraListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: uuid.UUID
    camera_id_label: str
    name: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    area: Optional[str] = None
    camera_type: Optional[CameraType] = None
    status: Optional[CameraStatus] = None
    department_id: uuid.UUID
    department_name: Optional[str] = None
    make: Optional[str] = None
    model_number: Optional[str] = None
    resolution: Optional[str] = None
    has_analytics: bool = False
    is_ptz: bool = False
    created_at: datetime


class GeoJSONGeometry(BaseModel):
    type: str = "Point"
    coordinates: List[float]


class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoJSONGeometry
    properties: Dict[str, Any]


class CameraGeoJSON(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]
