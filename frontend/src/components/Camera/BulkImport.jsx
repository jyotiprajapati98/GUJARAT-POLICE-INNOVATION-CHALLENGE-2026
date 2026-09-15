import React, { useState } from 'react'
import {
  Modal,
  Upload,
  Select,
  Button,
  Space,
  Typography,
  Table,
  Alert,
  message,
  Divider,
  Progress,
} from 'antd'
import {
  InboxOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { camerasAPI } from '../../services/api.js'

const { Dragger } = Upload
const { Text, Title } = Typography

const CSV_TEMPLATE_HEADERS = [
  'camera_id_label',
  'name',
  'camera_type',
  'status',
  'latitude',
  'longitude',
  'address',
  'area',
  'zone',
  'ward',
  'district',
  'city',
  'state',
  'pincode',
  'landmark',
  'location_type',
  'installation_height_m',
  'mounting_type',
  'make',
  'model_number',
  'serial_number',
  'asset_tag',
  'resolution',
  'resolution_megapixels',
  'field_of_view_degrees',
  'frame_rate_fps',
  'sensor_type',
  'weather_rating',
  'vandal_rating',
  'compression_format',
  'has_night_vision',
  'has_audio',
  'is_ptz',
  'ir_range_m',
  'optical_zoom',
  'digital_zoom',
  'ip_address',
  'mac_address',
  'network_type',
  'isp_provider',
  'bandwidth_mbps',
  'stream_protocol',
  'port_number',
  'nvr_dvr_id',
  'nvr_dvr_location',
  'vms_platform',
  'storage_type',
  'storage_capacity_tb',
  'retention_period_days',
  'storage_vendor',
  'vendor_name',
  'contractor_name',
  'owner_name',
  'owner_contact',
  'procurement_date',
  'installation_date',
  'warranty_expiry_date',
  'amc_expiry_date',
  'last_maintenance_at',
  'next_maintenance_due',
  'uptime_percentage',
  'coverage_radius_m',
  'coverage_direction_azimuth',
  'coverage_type',
  'has_analytics',
  'analytics_types',
  'analytics_vendor',
  'remarks',
]

// Sample row to help users understand the format
const SAMPLE_ROW = [
  'CAM-DL-001',
  'Connaught Place Junction',
  'dome',
  'active',
  '28.6139',
  '77.2090',
  '1 Connaught Place, New Delhi',
  'Connaught Place',
  'Central',
  'Ward 10',
  'New Delhi',
  'New Delhi',
  'Delhi',
  '110001',
  'Palika Bazaar',
  'outdoor',
  '6',
  'Pole Mount',
  'Hikvision',
  'DS-2CD2183G2-I',
  'SN123456',
  'AT-001',
  '1080p',
  '8',
  '120',
  '25',
  'CMOS',
  'IP67',
  'IK10',
  'H.265',
  'TRUE',
  'FALSE',
  'FALSE',
  '30',
  '1',
  '1',
  '192.168.1.100',
  'AA:BB:CC:DD:EE:FF',
  'LAN',
  'BSNL',
  '10',
  'RTSP',
  '554',
  'NVR-001',
  'CP Control Room',
  'Milestone XProtect',
  'NVR',
  '4',
  '30',
  'Seagate',
  'TechCorp India',
  'BuildCon Ltd',
  'Rajesh Kumar',
  '9876543210',
  '2023-01-15',
  '2023-03-01',
  '2025-12-31',
  '2024-12-31',
  '2024-01-10',
  '2024-07-01',
  '98.5',
  '50',
  '90',
  'Area Coverage',
  'TRUE',
  'ANPR,Crowd Detection',
  'AI Vision Inc.',
  'Main entrance coverage',
]

function downloadTemplate() {
  const rows = [CSV_TEMPLATE_HEADERS.join(','), SAMPLE_ROW.join(',')]
  const csv = rows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'camera_import_template.csv'
  a.click()
  URL.revokeObjectURL(url)
  message.success('Template downloaded.')
}

export default function BulkImport({ departments, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [departmentId, setDepartmentId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null) // { success, failed, errors }

  const beforeUpload = (f) => {
    const isCSV = f.type === 'text/csv' || f.name.endsWith('.csv')
    if (!isCSV) {
      message.error('Please upload a CSV file only.')
      return Upload.LIST_IGNORE
    }
    const isSmall = f.size / 1024 / 1024 < 10
    if (!isSmall) {
      message.error('File must be smaller than 10MB.')
      return Upload.LIST_IGNORE
    }
    setFile(f)
    return false // prevent auto-upload
  }

  const handleRemove = () => {
    setFile(null)
    setResult(null)
  }

  const handleImport = async () => {
    if (!file) {
      message.error('Please select a CSV file.')
      return
    }
    if (!departmentId) {
      message.error('Please select a department.')
      return
    }
    setLoading(true)
    setProgress(30)
    try {
      const data = await camerasAPI.bulkImport(file, departmentId)
      setProgress(100)
      setResult(data)
      if (data.success_count > 0) {
        message.success(`${data.success_count} cameras imported successfully.`)
      }
    } catch (err) {
      setProgress(0)
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Import failed. Please check your CSV file.'
      message.error(msg)
      setResult({ success_count: 0, failed_count: 0, errors: [msg] })
    } finally {
      setLoading(false)
    }
  }

  const errorColumns = [
    {
      title: 'Row',
      dataIndex: 'row',
      key: 'row',
      width: 60,
    },
    {
      title: 'Camera ID',
      dataIndex: 'camera_id_label',
      key: 'camera_id_label',
      width: 140,
    },
    {
      title: 'Error',
      dataIndex: 'error',
      key: 'error',
      render: (v) => <Text type="danger">{v}</Text>,
    },
  ]

  const hasResult = result !== null
  const canRetry = hasResult

  return (
    <Modal
      title="Bulk Import Cameras from CSV"
      open
      onCancel={onClose}
      width={680}
      footer={
        hasResult
          ? [
              <Button key="close" onClick={onClose}>
                Close
              </Button>,
              result?.success_count > 0 && (
                <Button key="done" type="primary" onClick={onSuccess}>
                  Done
                </Button>
              ),
            ]
          : [
              <Button key="cancel" onClick={onClose}>
                Cancel
              </Button>,
              <Button
                key="import"
                type="primary"
                loading={loading}
                onClick={handleImport}
                disabled={!file || !departmentId}
              >
                Import Cameras
              </Button>,
            ]
      }
      destroyOnClose
    >
      {!hasResult ? (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {/* Step 1: Download Template */}
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Step 1: Download and fill in the CSV template
            </Text>
            <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
              Download CSV Template
            </Button>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* Step 2: Select Department */}
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Step 2: Select the department for these cameras
            </Text>
            <Select
              placeholder="Select Department (required)"
              value={departmentId}
              onChange={setDepartmentId}
              style={{ width: '100%' }}
              options={departments.map((d) => ({ label: d.name, value: d.id }))}
              showSearch
              filterOption={(input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* Step 3: Upload File */}
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Step 3: Upload your filled CSV file
            </Text>
            <Dragger
              name="file"
              multiple={false}
              accept=".csv"
              beforeUpload={beforeUpload}
              onRemove={handleRemove}
              fileList={file ? [file] : []}
              maxCount={1}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag CSV file to upload</p>
              <p className="ant-upload-hint">
                Only CSV files are supported. Max file size: 10MB.
              </p>
            </Dragger>
          </div>

          {loading && (
            <Progress
              percent={progress}
              status="active"
              strokeColor={{ from: '#108ee9', to: '#87d068' }}
            />
          )}

          <Alert
            type="info"
            message="CSV Format Guidelines"
            description={
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                <li>First row must be the header row (column names)</li>
                <li>Required fields: camera_id_label, name, latitude, longitude, department_id is set from above selection</li>
                <li>Date format: YYYY-MM-DD (e.g. 2024-01-15)</li>
                <li>Boolean fields: TRUE or FALSE</li>
                <li>Camera types: dome, bullet, ptz, fisheye, box, thermal, other</li>
                <li>Status values: active, inactive, faulty, under_maintenance, decommissioned, planned</li>
              </ul>
            }
            showIcon
          />
        </Space>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {/* Import Result Summary */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div
              style={{
                flex: 1,
                minWidth: 140,
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 8,
                padding: '16px 20px',
                textAlign: 'center',
              }}
            >
              <CheckCircleOutlined style={{ fontSize: 28, color: '#52c41a', display: 'block', marginBottom: 8 }} />
              <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                {result.success_count || 0}
              </Title>
              <Text type="secondary">Cameras Imported</Text>
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 140,
                background: result.failed_count > 0 ? '#fff2f0' : '#f9f9f9',
                border: `1px solid ${result.failed_count > 0 ? '#ffccc7' : '#d9d9d9'}`,
                borderRadius: 8,
                padding: '16px 20px',
                textAlign: 'center',
              }}
            >
              <CloseCircleOutlined
                style={{
                  fontSize: 28,
                  color: result.failed_count > 0 ? '#ff4d4f' : '#bfbfbf',
                  display: 'block',
                  marginBottom: 8,
                }}
              />
              <Title level={3} style={{ margin: 0, color: result.failed_count > 0 ? '#ff4d4f' : '#bfbfbf' }}>
                {result.failed_count || 0}
              </Title>
              <Text type="secondary">Failed Rows</Text>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Error Details
              </Text>
              {Array.isArray(result.errors) && typeof result.errors[0] === 'object' ? (
                <Table
                  dataSource={result.errors}
                  columns={errorColumns}
                  rowKey={(r, i) => i}
                  size="small"
                  pagination={{ pageSize: 5 }}
                  scroll={{ y: 200 }}
                />
              ) : (
                <Alert
                  type="error"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {result.errors.map((e, i) => (
                        <li key={i}>{typeof e === 'string' ? e : JSON.stringify(e)}</li>
                      ))}
                    </ul>
                  }
                />
              )}
            </div>
          )}
        </Space>
      )}
    </Modal>
  )
}
