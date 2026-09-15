import React from 'react'
import { Modal, Tabs, Descriptions, Badge, Tag, Typography, Space } from 'antd'
import dayjs from 'dayjs'

const { Text } = Typography

const STATUS_COLOR = {
  active: 'success',
  inactive: 'default',
  faulty: 'error',
  under_maintenance: 'warning',
  decommissioned: 'error',
  planned: 'processing',
}

const STATUS_LABEL = {
  active: 'Active',
  inactive: 'Inactive',
  faulty: 'Faulty',
  under_maintenance: 'Under Maintenance',
  decommissioned: 'Decommissioned',
  planned: 'Planned',
}

const TYPE_EMOJI = {
  dome: '🔵',
  bullet: '🟡',
  ptz: '🔴',
  fisheye: '🟣',
  box: '⬜',
  thermal: '🔶',
  other: '⚪',
}

function val(v, fallback = '—') {
  if (v === null || v === undefined || v === '') return fallback
  return v
}

function dateVal(v) {
  if (!v) return '—'
  return dayjs(v).isValid() ? dayjs(v).format('DD MMM YYYY') : v
}

function boolVal(v) {
  if (v === true) return <Tag color="green">Yes</Tag>
  if (v === false) return <Tag color="default">No</Tag>
  return '—'
}

export default function CameraDetail({ camera, onClose }) {
  if (!camera) return null

  const tabItems = [
    {
      key: '1',
      label: 'Basic Info',
      children: (
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" labelStyle={{ fontWeight: 600, width: 160 }}>
          <Descriptions.Item label="Camera ID">
            <Text code>{val(camera.camera_id_label)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Name">{val(camera.name)}</Descriptions.Item>
          <Descriptions.Item label="Camera Type">
            {camera.camera_type
              ? `${TYPE_EMOJI[camera.camera_type] || ''} ${camera.camera_type.charAt(0).toUpperCase() + camera.camera_type.slice(1)}`
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Badge
              status={STATUS_COLOR[camera.status]}
              text={STATUS_LABEL[camera.status] || camera.status || '—'}
            />
          </Descriptions.Item>
          <Descriptions.Item label="Department">
            {camera.department?.name || camera.department_name || val(camera.department_id)}
          </Descriptions.Item>
          <Descriptions.Item label="Sub Department">{val(camera.sub_department)}</Descriptions.Item>
          <Descriptions.Item label="Internal ID" span={2}>
            <Text type="secondary" style={{ fontSize: 12 }}>{val(camera.id)}</Text>
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: '2',
      label: 'Location',
      children: (
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" labelStyle={{ fontWeight: 600, width: 160 }}>
          <Descriptions.Item label="Latitude">{val(camera.latitude)}</Descriptions.Item>
          <Descriptions.Item label="Longitude">{val(camera.longitude)}</Descriptions.Item>
          <Descriptions.Item label="Address" span={2}>{val(camera.address)}</Descriptions.Item>
          <Descriptions.Item label="Area">{val(camera.area)}</Descriptions.Item>
          <Descriptions.Item label="Zone">{val(camera.zone)}</Descriptions.Item>
          <Descriptions.Item label="Ward">{val(camera.ward)}</Descriptions.Item>
          <Descriptions.Item label="District">{val(camera.district)}</Descriptions.Item>
          <Descriptions.Item label="City">{val(camera.city)}</Descriptions.Item>
          <Descriptions.Item label="State">{val(camera.state)}</Descriptions.Item>
          <Descriptions.Item label="Pincode">{val(camera.pincode)}</Descriptions.Item>
          <Descriptions.Item label="Landmark">{val(camera.landmark)}</Descriptions.Item>
          <Descriptions.Item label="Location Type">
            {camera.location_type
              ? camera.location_type.charAt(0).toUpperCase() + camera.location_type.slice(1)
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Install Height">
            {camera.installation_height_m != null ? `${camera.installation_height_m} m` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Mounting Type">{val(camera.mounting_type)}</Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: '3',
      label: 'Technical',
      children: (
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" labelStyle={{ fontWeight: 600, width: 160 }}>
          <Descriptions.Item label="Make / Brand">{val(camera.make)}</Descriptions.Item>
          <Descriptions.Item label="Model Number">{val(camera.model_number)}</Descriptions.Item>
          <Descriptions.Item label="Serial Number">{val(camera.serial_number)}</Descriptions.Item>
          <Descriptions.Item label="Asset Tag">{val(camera.asset_tag)}</Descriptions.Item>
          <Descriptions.Item label="Resolution">{val(camera.resolution)}</Descriptions.Item>
          <Descriptions.Item label="Megapixels">
            {camera.resolution_megapixels != null ? `${camera.resolution_megapixels} MP` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Field of View">
            {camera.field_of_view_degrees != null ? `${camera.field_of_view_degrees}°` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Frame Rate">
            {camera.frame_rate_fps != null ? `${camera.frame_rate_fps} fps` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Sensor Type">{val(camera.sensor_type)}</Descriptions.Item>
          <Descriptions.Item label="Weather Rating">{val(camera.weather_rating)}</Descriptions.Item>
          <Descriptions.Item label="Vandal Rating">{val(camera.vandal_rating)}</Descriptions.Item>
          <Descriptions.Item label="Compression">{val(camera.compression_format)}</Descriptions.Item>
          <Descriptions.Item label="Night Vision">{boolVal(camera.has_night_vision)}</Descriptions.Item>
          <Descriptions.Item label="Audio">{boolVal(camera.has_audio)}</Descriptions.Item>
          <Descriptions.Item label="PTZ">{boolVal(camera.is_ptz)}</Descriptions.Item>
          <Descriptions.Item label="IR Range">
            {camera.ir_range_m != null ? `${camera.ir_range_m} m` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Optical Zoom">
            {camera.optical_zoom != null ? `${camera.optical_zoom}x` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Digital Zoom">
            {camera.digital_zoom != null ? `${camera.digital_zoom}x` : '—'}
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: '4',
      label: 'Connectivity & Storage',
      children: (
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" labelStyle={{ fontWeight: 600, width: 160 }}>
          <Descriptions.Item label="IP Address">
            {camera.ip_address ? <Text code>{camera.ip_address}</Text> : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="MAC Address">
            {camera.mac_address ? <Text code>{camera.mac_address}</Text> : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Network Type">{val(camera.network_type)}</Descriptions.Item>
          <Descriptions.Item label="ISP Provider">{val(camera.isp_provider)}</Descriptions.Item>
          <Descriptions.Item label="Bandwidth">
            {camera.bandwidth_mbps != null ? `${camera.bandwidth_mbps} Mbps` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Stream Protocol">{val(camera.stream_protocol)}</Descriptions.Item>
          <Descriptions.Item label="Port Number">{val(camera.port_number)}</Descriptions.Item>
          <Descriptions.Item label="NVR/DVR ID">{val(camera.nvr_dvr_id)}</Descriptions.Item>
          <Descriptions.Item label="NVR/DVR Location">{val(camera.nvr_dvr_location)}</Descriptions.Item>
          <Descriptions.Item label="VMS Platform">{val(camera.vms_platform)}</Descriptions.Item>
          <Descriptions.Item label="Storage Type">{val(camera.storage_type)}</Descriptions.Item>
          <Descriptions.Item label="Storage Capacity">
            {camera.storage_capacity_tb != null ? `${camera.storage_capacity_tb} TB` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Retention Period">
            {camera.retention_period_days != null ? `${camera.retention_period_days} days` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Storage Vendor">{val(camera.storage_vendor)}</Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: '5',
      label: 'Ownership & Maintenance',
      children: (
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" labelStyle={{ fontWeight: 600, width: 160 }}>
          <Descriptions.Item label="Vendor">{val(camera.vendor_name)}</Descriptions.Item>
          <Descriptions.Item label="Contractor">{val(camera.contractor_name)}</Descriptions.Item>
          <Descriptions.Item label="Owner Name">{val(camera.owner_name)}</Descriptions.Item>
          <Descriptions.Item label="Owner Contact">{val(camera.owner_contact)}</Descriptions.Item>
          <Descriptions.Item label="Procurement Date">{dateVal(camera.procurement_date)}</Descriptions.Item>
          <Descriptions.Item label="Installation Date">{dateVal(camera.installation_date)}</Descriptions.Item>
          <Descriptions.Item label="Warranty Expiry">{dateVal(camera.warranty_expiry_date)}</Descriptions.Item>
          <Descriptions.Item label="AMC Expiry">{dateVal(camera.amc_expiry_date)}</Descriptions.Item>
          <Descriptions.Item label="Last Maintenance">{dateVal(camera.last_maintenance_at)}</Descriptions.Item>
          <Descriptions.Item label="Next Maintenance">{dateVal(camera.next_maintenance_due)}</Descriptions.Item>
          <Descriptions.Item label="Uptime">
            {camera.uptime_percentage != null ? `${camera.uptime_percentage}%` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Coverage Radius">
            {camera.coverage_radius_m != null ? `${camera.coverage_radius_m} m` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Coverage Azimuth">
            {camera.coverage_direction_azimuth != null ? `${camera.coverage_direction_azimuth}°` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Coverage Type">{val(camera.coverage_type)}</Descriptions.Item>
          <Descriptions.Item label="Analytics">{boolVal(camera.has_analytics)}</Descriptions.Item>
          <Descriptions.Item label="Analytics Types">{val(camera.analytics_types)}</Descriptions.Item>
          <Descriptions.Item label="Analytics Vendor">{val(camera.analytics_vendor)}</Descriptions.Item>
          <Descriptions.Item label="Remarks" span={2}>
            {val(camera.remarks)}
          </Descriptions.Item>
          <Descriptions.Item label="Created At">{dateVal(camera.created_at)}</Descriptions.Item>
          <Descriptions.Item label="Updated At">{dateVal(camera.updated_at)}</Descriptions.Item>
        </Descriptions>
      ),
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <Text code style={{ fontSize: 13 }}>{camera.camera_id_label || 'Camera'}</Text>
          <Text strong>{camera.name}</Text>
          <Badge
            status={STATUS_COLOR[camera.status]}
            text={STATUS_LABEL[camera.status] || camera.status}
          />
        </Space>
      }
      open
      onCancel={onClose}
      onOk={onClose}
      width={820}
      okText="Close"
      cancelButtonProps={{ style: { display: 'none' } }}
      destroyOnClose
    >
      <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
        <Tabs items={tabItems} defaultActiveKey="1" size="small" />
      </div>
    </Modal>
  )
}
