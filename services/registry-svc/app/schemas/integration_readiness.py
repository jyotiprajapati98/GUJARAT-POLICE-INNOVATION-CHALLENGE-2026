from __future__ import annotations
from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, model_validator

from app.models.integration_readiness import IntegrationStatus


class IntegrationReadinessCreate(BaseModel):
    camera_id: UUID

    # Protocol availability
    rtsp_available: Optional[bool] = False
    onvif_available: Optional[bool] = False
    rest_api_available: Optional[bool] = False
    vendor_sdk_available: Optional[bool] = False
    metadata_api_available: Optional[bool] = False
    event_api_available: Optional[bool] = False
    live_stream_available: Optional[bool] = False
    playback_api_available: Optional[bool] = False
    ai_capability_available: Optional[bool] = False

    # RTSP details
    rtsp_port: Optional[str] = None
    rtsp_tested: Optional[bool] = False
    rtsp_last_tested_at: Optional[datetime] = None

    # ONVIF details
    onvif_port: Optional[str] = None
    onvif_tested: Optional[bool] = False

    # VMS
    vms_vendor: Optional[str] = None
    vms_platform: Optional[str] = None
    vms_camera_id: Optional[str] = None
    vms_site: Optional[str] = None
    vms_integration_method: Optional[str] = None

    # Overall status
    integration_status: Optional[IntegrationStatus] = IntegrationStatus.info_required
    integration_notes: Optional[str] = None


class IntegrationReadinessUpdate(BaseModel):
    # Protocol availability
    rtsp_available: Optional[bool] = None
    onvif_available: Optional[bool] = None
    rest_api_available: Optional[bool] = None
    vendor_sdk_available: Optional[bool] = None
    metadata_api_available: Optional[bool] = None
    event_api_available: Optional[bool] = None
    live_stream_available: Optional[bool] = None
    playback_api_available: Optional[bool] = None
    ai_capability_available: Optional[bool] = None

    # RTSP details
    rtsp_port: Optional[str] = None
    rtsp_tested: Optional[bool] = None
    rtsp_last_tested_at: Optional[datetime] = None

    # ONVIF details
    onvif_port: Optional[str] = None
    onvif_tested: Optional[bool] = None

    # VMS
    vms_vendor: Optional[str] = None
    vms_platform: Optional[str] = None
    vms_camera_id: Optional[str] = None
    vms_site: Optional[str] = None
    vms_integration_method: Optional[str] = None

    # Overall status
    integration_status: Optional[IntegrationStatus] = None
    integration_notes: Optional[str] = None


class IntegrationReadinessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    camera_id: UUID

    # Protocol availability
    rtsp_available: bool
    onvif_available: bool
    rest_api_available: bool
    vendor_sdk_available: bool
    metadata_api_available: bool
    event_api_available: bool
    live_stream_available: bool
    playback_api_available: bool
    ai_capability_available: bool

    # RTSP details
    rtsp_port: Optional[str] = None
    rtsp_tested: bool
    rtsp_last_tested_at: Optional[datetime] = None

    # ONVIF details
    onvif_port: Optional[str] = None
    onvif_tested: bool

    # VMS
    vms_vendor: Optional[str] = None
    vms_platform: Optional[str] = None
    vms_camera_id: Optional[str] = None
    vms_site: Optional[str] = None
    vms_integration_method: Optional[str] = None

    # Overall status
    integration_status: IntegrationStatus
    integration_notes: Optional[str] = None

    # Audit
    last_assessed_at: Optional[datetime] = None
    assessed_by_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    # Computed field
    readiness_score: int = 0

    @model_validator(mode="after")
    def compute_readiness_score(self) -> "IntegrationReadinessResponse":
        availability_fields = [
            self.rtsp_available,
            self.onvif_available,
            self.rest_api_available,
            self.vendor_sdk_available,
            self.metadata_api_available,
            self.event_api_available,
            self.live_stream_available,
            self.playback_api_available,
            self.ai_capability_available,
        ]
        self.readiness_score = sum(1 for f in availability_fields if f is True)
        return self
