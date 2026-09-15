import React, { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  DatePicker,
  Tabs,
  Button,
  Space,
  message,
  Radio,
  Divider,
} from 'antd'
import dayjs from 'dayjs'
import { camerasAPI } from '../../services/api.js'

const { TextArea } = Input

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Faulty', value: 'faulty' },
  { label: 'Under Maintenance', value: 'under_maintenance' },
  { label: 'Decommissioned', value: 'decommissioned' },
  { label: 'Planned', value: 'planned' },
]

const TYPE_OPTIONS = [
  { label: '🔵 Dome', value: 'dome' },
  { label: '🟡 Bullet', value: 'bullet' },
  { label: '🔴 PTZ', value: 'ptz' },
  { label: '🟣 Fisheye', value: 'fisheye' },
  { label: '⬜ Box', value: 'box' },
  { label: '🔶 Thermal', value: 'thermal' },
  { label: '⚪ Other', value: 'other' },
]

const RESOLUTION_OPTIONS = [
  '480p', '720p', '1080p', '2MP', '4MP', '5MP', '8MP', '4K',
].map((v) => ({ label: v, value: v }))

const SENSOR_OPTIONS = [
  { label: 'CCD', value: 'CCD' },
  { label: 'CMOS', value: 'CMOS' },
]

const COMPRESSION_OPTIONS = [
  { label: 'H.264', value: 'H.264' },
  { label: 'H.265', value: 'H.265' },
  { label: 'MJPEG', value: 'MJPEG' },
]

const NETWORK_OPTIONS = [
  'LAN', 'WiFi', '4G', '5G', 'Fiber', 'Leased Line',
].map((v) => ({ label: v, value: v }))

const STREAM_OPTIONS = [
  { label: 'RTSP', value: 'RTSP' },
  { label: 'ONVIF', value: 'ONVIF' },
  { label: 'HTTP', value: 'HTTP' },
]

const STORAGE_TYPE_OPTIONS = [
  'NVR', 'DVR', 'Cloud', 'Edge Storage', 'SD Card', 'Hybrid',
].map((v) => ({ label: v, value: v }))

const MOUNTING_OPTIONS = [
  'Wall Mount', 'Ceiling Mount', 'Pole Mount', 'Corner Mount', 'Parapet Mount', 'Vehicle Mount',
].map((v) => ({ label: v, value: v }))

const COVERAGE_TYPE_OPTIONS = [
  'Area Coverage', 'Point Coverage', 'Perimeter Coverage', 'Traffic',
].map((v) => ({ label: v, value: v }))

function dateToString(v) {
  if (!v) return undefined
  if (typeof v === 'string') return v
  return dayjs.isDayjs(v) ? v.format('YYYY-MM-DD') : undefined
}

function toDayjs(v) {
  if (!v) return undefined
  return dayjs(v).isValid() ? dayjs(v) : undefined
}

export default function CameraForm({ camera, departments, onClose, onSuccess }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const isEdit = !!camera

  useEffect(() => {
    if (camera) {
      form.setFieldsValue({
        ...camera,
        department_id: camera.department_id || camera.department?.id,
        procurement_date: toDayjs(camera.procurement_date),
        installation_date: toDayjs(camera.installation_date),
        warranty_expiry_date: toDayjs(camera.warranty_expiry_date),
        amc_expiry_date: toDayjs(camera.amc_expiry_date),
        last_maintenance_at: toDayjs(camera.last_maintenance_at),
        next_maintenance_due: toDayjs(camera.next_maintenance_due),
      })
    } else {
      form.resetFields()
      form.setFieldsValue({
        status: 'planned',
        location_type: 'outdoor',
        has_night_vision: false,
        has_audio: false,
        is_ptz: false,
        has_analytics: false,
      })
    }
  }, [camera, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      // Convert dayjs dates to strings
      const dateFields = [
        'procurement_date',
        'installation_date',
        'warranty_expiry_date',
        'amc_expiry_date',
        'last_maintenance_at',
        'next_maintenance_due',
      ]
      dateFields.forEach((f) => {
        values[f] = dateToString(values[f])
      })

      if (isEdit) {
        await camerasAPI.update(camera.id, values)
        message.success('Camera updated successfully.')
      } else {
        await camerasAPI.create(values)
        message.success('Camera created successfully.')
      }
      onSuccess()
    } catch (err) {
      if (err?.errorFields) return // validation error, form shows inline
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to save camera.'
      message.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const tabItems = [
    {
      key: '1',
      label: 'Basic Info',
      children: (
        <div>
          <Form.Item
            name="camera_id_label"
            label="Camera ID Label"
            rules={[{ required: true, message: 'Camera ID is required' }]}
          >
            <Input placeholder="e.g. CAM-DL-001" />
          </Form.Item>
          <Form.Item
            name="name"
            label="Camera Name"
            rules={[{ required: true, message: 'Camera name is required' }]}
          >
            <Input placeholder="e.g. Connaught Place Junction Camera 1" />
          </Form.Item>
          <Form.Item name="camera_type" label="Camera Type">
            <Select options={TYPE_OPTIONS} placeholder="Select type" allowClear />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={STATUS_OPTIONS} placeholder="Select status" />
          </Form.Item>
          <Form.Item
            name="department_id"
            label="Department"
            rules={[{ required: true, message: 'Department is required' }]}
          >
            <Select
              options={departments.map((d) => ({ label: d.name, value: d.id }))}
              placeholder="Select department"
              showSearch
              filterOption={(input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="sub_department" label="Sub Department">
            <Input placeholder="e.g. Traffic Branch" />
          </Form.Item>
        </div>
      ),
    },
    {
      key: '2',
      label: 'Location',
      children: (
        <div>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item
              name="latitude"
              label="Latitude"
              rules={[{ required: true, message: 'Latitude is required' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                placeholder="28.6139"
                min={-90}
                max={90}
                step={0.000001}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item
              name="longitude"
              label="Longitude"
              rules={[{ required: true, message: 'Longitude is required' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                placeholder="77.2090"
                min={-180}
                max={180}
                step={0.000001}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Space>
          <Form.Item name="address" label="Address">
            <Input placeholder="Full address" />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="area" label="Area" style={{ flex: 1 }}>
              <Input placeholder="e.g. Connaught Place" />
            </Form.Item>
            <Form.Item name="zone" label="Zone" style={{ flex: 1 }}>
              <Input placeholder="e.g. Central" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="ward" label="Ward" style={{ flex: 1 }}>
              <Input placeholder="e.g. Ward 12" />
            </Form.Item>
            <Form.Item name="district" label="District" style={{ flex: 1 }}>
              <Input placeholder="e.g. New Delhi" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="city" label="City" style={{ flex: 1 }}>
              <Input placeholder="e.g. New Delhi" />
            </Form.Item>
            <Form.Item name="state" label="State" style={{ flex: 1 }}>
              <Input placeholder="e.g. Delhi" />
            </Form.Item>
            <Form.Item name="pincode" label="Pincode" style={{ flex: 1 }}>
              <Input placeholder="110001" maxLength={6} />
            </Form.Item>
          </Space>
          <Form.Item name="landmark" label="Landmark">
            <Input placeholder="Nearest landmark" />
          </Form.Item>
          <Form.Item name="location_type" label="Location Type">
            <Radio.Group>
              <Radio value="outdoor">Outdoor</Radio>
              <Radio value="indoor">Indoor</Radio>
            </Radio.Group>
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="installation_height_m" label="Installation Height (m)" style={{ flex: 1 }}>
              <InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="mounting_type" label="Mounting Type" style={{ flex: 1 }}>
              <Select options={MOUNTING_OPTIONS} allowClear placeholder="Select" />
            </Form.Item>
          </Space>
        </div>
      ),
    },
    {
      key: '3',
      label: 'Technical',
      children: (
        <div>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="make" label="Make / Brand" style={{ flex: 1 }}>
              <Input placeholder="e.g. Hikvision" />
            </Form.Item>
            <Form.Item name="model_number" label="Model Number" style={{ flex: 1 }}>
              <Input placeholder="e.g. DS-2CD2183G2-I" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="serial_number" label="Serial Number" style={{ flex: 1 }}>
              <Input placeholder="Serial number" />
            </Form.Item>
            <Form.Item name="asset_tag" label="Asset Tag" style={{ flex: 1 }}>
              <Input placeholder="Asset tag" />
            </Form.Item>
          </Space>
          <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13 }}>
            Imaging
          </Divider>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="resolution" label="Resolution" style={{ flex: 1 }}>
              <Select options={RESOLUTION_OPTIONS} allowClear placeholder="Select" />
            </Form.Item>
            <Form.Item name="resolution_megapixels" label="Megapixels" style={{ flex: 1 }}>
              <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="field_of_view_degrees" label="Field of View (°)" style={{ flex: 1 }}>
              <InputNumber min={0} max={360} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="frame_rate_fps" label="Frame Rate (fps)" style={{ flex: 1 }}>
              <InputNumber min={1} max={120} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="sensor_type" label="Sensor Type" style={{ flex: 1 }}>
              <Select options={SENSOR_OPTIONS} allowClear placeholder="Select" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="weather_rating" label="Weather Rating (IP)" style={{ flex: 1 }}>
              <Input placeholder="e.g. IP67" />
            </Form.Item>
            <Form.Item name="vandal_rating" label="Vandal Rating (IK)" style={{ flex: 1 }}>
              <Input placeholder="e.g. IK10" />
            </Form.Item>
            <Form.Item name="compression_format" label="Compression" style={{ flex: 1 }}>
              <Select options={COMPRESSION_OPTIONS} allowClear placeholder="Select" />
            </Form.Item>
          </Space>
          <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13 }}>
            Features
          </Divider>
          <Space size={24} wrap>
            <Form.Item name="has_night_vision" label="Night Vision" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="has_audio" label="Audio" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_ptz" label="PTZ" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="ir_range_m" label="IR Range (m)" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="optical_zoom" label="Optical Zoom (x)" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="digital_zoom" label="Digital Zoom (x)" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
        </div>
      ),
    },
    {
      key: '4',
      label: 'Connectivity & Storage',
      children: (
        <div>
          <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13 }}>
            Network
          </Divider>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="ip_address" label="IP Address" style={{ flex: 1 }}>
              <Input placeholder="e.g. 192.168.1.100" />
            </Form.Item>
            <Form.Item name="mac_address" label="MAC Address" style={{ flex: 1 }}>
              <Input placeholder="e.g. AA:BB:CC:DD:EE:FF" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="network_type" label="Network Type" style={{ flex: 1 }}>
              <Select options={NETWORK_OPTIONS} allowClear placeholder="Select" />
            </Form.Item>
            <Form.Item name="isp_provider" label="ISP Provider" style={{ flex: 1 }}>
              <Input placeholder="e.g. BSNL" />
            </Form.Item>
            <Form.Item name="bandwidth_mbps" label="Bandwidth (Mbps)" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="stream_protocol" label="Stream Protocol" style={{ flex: 1 }}>
              <Select options={STREAM_OPTIONS} allowClear placeholder="Select" />
            </Form.Item>
            <Form.Item name="port_number" label="Port Number" style={{ flex: 1 }}>
              <InputNumber min={1} max={65535} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13 }}>
            Storage & VMS
          </Divider>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="nvr_dvr_id" label="NVR/DVR ID" style={{ flex: 1 }}>
              <Input placeholder="e.g. NVR-001" />
            </Form.Item>
            <Form.Item name="nvr_dvr_location" label="NVR/DVR Location" style={{ flex: 1 }}>
              <Input placeholder="e.g. CP Control Room" />
            </Form.Item>
          </Space>
          <Form.Item name="vms_platform" label="VMS Platform">
            <Input placeholder="e.g. Milestone XProtect" />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="storage_type" label="Storage Type" style={{ flex: 1 }}>
              <Select options={STORAGE_TYPE_OPTIONS} allowClear placeholder="Select" />
            </Form.Item>
            <Form.Item name="storage_capacity_tb" label="Storage (TB)" style={{ flex: 1 }}>
              <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="retention_period_days" label="Retention (Days)" style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="storage_vendor" label="Storage Vendor" style={{ flex: 1 }}>
              <Input placeholder="e.g. Seagate" />
            </Form.Item>
          </Space>
        </div>
      ),
    },
    {
      key: '5',
      label: 'Ownership & Maintenance',
      children: (
        <div>
          <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13 }}>
            Ownership
          </Divider>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="vendor_name" label="Vendor" style={{ flex: 1 }}>
              <Input placeholder="Vendor company name" />
            </Form.Item>
            <Form.Item name="contractor_name" label="Contractor" style={{ flex: 1 }}>
              <Input placeholder="Contractor name" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="owner_name" label="Owner Name" style={{ flex: 1 }}>
              <Input placeholder="Asset owner" />
            </Form.Item>
            <Form.Item name="owner_contact" label="Owner Contact" style={{ flex: 1 }}>
              <Input placeholder="Phone / email" />
            </Form.Item>
          </Space>
          <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13 }}>
            Dates
          </Divider>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="procurement_date" label="Procurement Date" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="installation_date" label="Installation Date" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="warranty_expiry_date" label="Warranty Expiry" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="amc_expiry_date" label="AMC Expiry" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="last_maintenance_at" label="Last Maintenance" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="next_maintenance_due" label="Next Maintenance Due" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="uptime_percentage" label="Uptime (%)">
            <InputNumber min={0} max={100} step={0.1} style={{ width: 160 }} />
          </Form.Item>
          <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13 }}>
            Coverage
          </Divider>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="coverage_radius_m" label="Coverage Radius (m)" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="coverage_direction_azimuth" label="Azimuth (°)" style={{ flex: 1 }}>
              <InputNumber min={0} max={360} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="coverage_type" label="Coverage Type" style={{ flex: 1 }}>
              <Select options={COVERAGE_TYPE_OPTIONS} allowClear placeholder="Select" />
            </Form.Item>
          </Space>
          <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13 }}>
            Analytics
          </Divider>
          <Form.Item name="has_analytics" label="Has Analytics" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="analytics_types" label="Analytics Types" style={{ flex: 1 }}>
              <Input placeholder="e.g. ANPR, Face Recognition, Crowd Detection" />
            </Form.Item>
            <Form.Item name="analytics_vendor" label="Analytics Vendor" style={{ flex: 1 }}>
              <Input placeholder="Vendor name" />
            </Form.Item>
          </Space>
          <Form.Item name="remarks" label="Remarks">
            <TextArea rows={3} placeholder="Any additional notes..." maxLength={1000} showCount />
          </Form.Item>
        </div>
      ),
    },
  ]

  return (
    <Modal
      title={isEdit ? `Edit Camera: ${camera.camera_id_label || camera.name}` : 'Add New Camera'}
      open
      onCancel={onClose}
      width={780}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" loading={loading} onClick={handleSubmit}>
          {isEdit ? 'Save Changes' : 'Create Camera'}
        </Button>,
      ]}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        size="middle"
        scrollToFirstError
        style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 8 }}
      >
        <Tabs items={tabItems} defaultActiveKey="1" size="small" />
      </Form>
    </Modal>
  )
}
