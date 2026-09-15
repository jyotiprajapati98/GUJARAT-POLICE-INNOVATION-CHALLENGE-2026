import React, { useState, useEffect, useCallback } from 'react'
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Spin,
  Empty,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
} from 'antd'
import { CheckOutlined, MinusOutlined } from '@ant-design/icons'
import { integrationAPI } from '../services/api.js'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

const STATUS_CONFIG = {
  integration_ready: { color: 'green', label: 'Integration Ready' },
  ready_with_adapter: { color: 'blue', label: 'Ready with Adapter' },
  sdk_required: { color: 'orange', label: 'SDK Required' },
  info_required: { color: 'gold', label: 'Info Required' },
  not_integrable: { color: 'red', label: 'Not Integrable' },
}

const BOOL_FIELDS = [
  { key: 'rtsp_available', label: 'RTSP' },
  { key: 'onvif_available', label: 'ONVIF' },
  { key: 'rest_api_available', label: 'REST API' },
  { key: 'vendor_sdk_available', label: 'SDK' },
  { key: 'live_stream_available', label: 'Live Stream' },
  { key: 'metadata_api_available', label: 'Metadata API' },
  { key: 'event_api_available', label: 'Event API' },
  { key: 'playback_api_available', label: 'Playback API' },
  { key: 'ai_capability_available', label: 'AI Capability' },
]

const CHECK_ICON = <CheckOutlined style={{ color: '#52c41a', fontWeight: 700 }} />
const DASH_ICON = <MinusOutlined style={{ color: '#bfbfbf' }} />

export default function IntegrationReadiness() {
  const [summary, setSummary] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [assessModalOpen, setAssessModalOpen] = useState(false)
  const [assessingCamera, setAssessingCamera] = useState(null)
  const [assessData, setAssessData] = useState(null)
  const [assessLoading, setAssessLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [sumRes, statsRes] = await Promise.allSettled([
        integrationAPI.getSummary(),
        integrationAPI.getStats(),
      ])
      if (sumRes.status === 'fulfilled') {
        setSummary(Array.isArray(sumRes.value) ? sumRes.value : [])
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openAssessModal = async (camera) => {
    setAssessingCamera(camera)
    setAssessModalOpen(true)
    setAssessData(null)
    setAssessLoading(true)
    form.resetFields()
    try {
      const data = await integrationAPI.getByCamera(camera.camera_id_label || camera.id)
      setAssessData(data)
      form.setFieldsValue({
        integration_status: data.integration_status,
        vms_vendor: data.vms_vendor,
        vms_platform: data.vms_platform,
        vms_camera_id: data.vms_camera_id,
        vms_site: data.vms_site,
        vms_integration_method: data.vms_integration_method,
        rtsp_available: data.rtsp_available ?? false,
        onvif_available: data.onvif_available ?? false,
        rest_api_available: data.rest_api_available ?? false,
        vendor_sdk_available: data.vendor_sdk_available ?? false,
        metadata_api_available: data.metadata_api_available ?? false,
        event_api_available: data.event_api_available ?? false,
        live_stream_available: data.live_stream_available ?? false,
        playback_api_available: data.playback_api_available ?? false,
        ai_capability_available: data.ai_capability_available ?? false,
        rtsp_port: data.rtsp_port,
        onvif_port: data.onvif_port,
        rtsp_tested: data.rtsp_tested ?? false,
        onvif_tested: data.onvif_tested ?? false,
        integration_notes: data.integration_notes,
      })
    } catch {
      // New assessment, start with defaults
      form.setFieldsValue({
        integration_status: 'info_required',
        rtsp_available: false,
        onvif_available: false,
        rest_api_available: false,
        vendor_sdk_available: false,
        metadata_api_available: false,
        event_api_available: false,
        live_stream_available: false,
        playback_api_available: false,
        ai_capability_available: false,
        rtsp_tested: false,
        onvif_tested: false,
      })
    } finally {
      setAssessLoading(false)
    }
  }

  const handleAssessSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const cameraId = assessingCamera.camera_id_label || assessingCamera.id
      await integrationAPI.upsert(cameraId, values)
      message.success('Integration assessment saved')
      setAssessModalOpen(false)
      fetchData()
    } catch (err) {
      if (err?.errorFields) return
      message.error(err?.response?.data?.detail || 'Failed to save assessment')
    } finally {
      setSubmitting(false)
    }
  }

  const statCards = stats
    ? [
        { key: 'integration_ready', label: 'Integration Ready', color: '#f6ffed' },
        { key: 'ready_with_adapter', label: 'Ready with Adapter', color: '#e6f4ff' },
        { key: 'sdk_required', label: 'SDK Required', color: '#fff7e6' },
        { key: 'info_required', label: 'Info Required', color: '#fffbe6' },
        { key: 'not_integrable', label: 'Not Integrable', color: '#fff2f0' },
      ]
    : []

  const columns = [
    {
      title: 'Camera ID',
      dataIndex: 'camera_id_label',
      key: 'camera_id_label',
      width: 120,
      render: (v) => v || '—',
    },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Department',
      dataIndex: 'dept_name',
      key: 'dept_name',
      render: (v) => v || '—',
    },
    {
      title: 'VMS Platform',
      dataIndex: 'vms_platform',
      key: 'vms_platform',
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'RTSP',
      dataIndex: 'rtsp_available',
      key: 'rtsp_available',
      align: 'center',
      render: (v) => (v ? CHECK_ICON : DASH_ICON),
    },
    {
      title: 'ONVIF',
      dataIndex: 'onvif_available',
      key: 'onvif_available',
      align: 'center',
      render: (v) => (v ? CHECK_ICON : DASH_ICON),
    },
    {
      title: 'REST API',
      dataIndex: 'rest_api_available',
      key: 'rest_api_available',
      align: 'center',
      render: (v) => (v ? CHECK_ICON : DASH_ICON),
    },
    {
      title: 'SDK',
      dataIndex: 'vendor_sdk_available',
      key: 'vendor_sdk_available',
      align: 'center',
      render: (v) => (v ? CHECK_ICON : DASH_ICON),
    },
    {
      title: 'Live Stream',
      dataIndex: 'live_stream_available',
      key: 'live_stream_available',
      align: 'center',
      render: (v) => (v ? CHECK_ICON : DASH_ICON),
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      align: 'center',
      render: (v) => (
        <Text strong style={{ color: v >= 7 ? '#52c41a' : v >= 4 ? '#fa8c16' : '#ff4d4f' }}>
          {v ?? 0}/9
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => {
        const cfg = STATUS_CONFIG[v] || { color: 'default', label: v || 'Not Assessed' }
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button size="small" type="primary" ghost onClick={() => openAssessModal(record)}>
          Assess
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>
        Integration Readiness
      </Title>

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {statCards.map(({ key, label, color }) => (
            <Col xs={12} sm={12} md={8} lg={4} key={key}>
              <Card style={{ background: color, borderColor: 'transparent' }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  {stats.by_status?.[key] ?? 0}
                </div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{label}</div>
                {stats.total_cameras != null && (
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                    of {stats.total_cameras} cameras
                  </div>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Summary Table */}
      <Card title="Camera Integration Summary">
        {summary.length > 0 ? (
          <Table
            dataSource={summary}
            rowKey={(r) => r.camera_id_label || r.id || Math.random()}
            columns={columns}
            pagination={{ pageSize: 20 }}
            size="small"
            scroll={{ x: 1100 }}
            locale={{ emptyText: <Empty description="No cameras found" /> }}
          />
        ) : (
          <Empty description="No integration data available" />
        )}
      </Card>

      {/* Assess Modal */}
      <Modal
        title={`Assess: ${assessingCamera?.name || assessingCamera?.camera_id_label || 'Camera'}`}
        open={assessModalOpen}
        onOk={handleAssessSubmit}
        onCancel={() => setAssessModalOpen(false)}
        confirmLoading={submitting}
        okText="Save Assessment"
        width={680}
        destroyOnClose
      >
        {assessLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : (
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item
              name="integration_status"
              label="Integration Status"
              rules={[{ required: true, message: 'Status is required' }]}
            >
              <Select placeholder="Select status">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <Option key={k} value={k}>
                    <Tag color={v.color}>{v.label}</Tag>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="vms_vendor" label="VMS Vendor">
                  <Input placeholder="e.g. Hikvision" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="vms_platform" label="VMS Platform">
                  <Input placeholder="e.g. iVMS-4200" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="vms_camera_id" label="VMS Camera ID">
                  <Input placeholder="Camera ID in VMS" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="vms_site" label="VMS Site">
                  <Input placeholder="Site name" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="vms_integration_method" label="Integration Method">
                  <Input placeholder="e.g. SDK, REST" />
                </Form.Item>
              </Col>
            </Row>

            <Card
              size="small"
              title="Protocol Availability"
              style={{ marginBottom: 16 }}
            >
              <Row gutter={[16, 8]}>
                {BOOL_FIELDS.map(({ key, label }) => (
                  <Col span={8} key={key}>
                    <Form.Item name={key} label={label} valuePropName="checked" style={{ marginBottom: 8 }}>
                      <Switch size="small" />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </Card>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="rtsp_port" label="RTSP Port">
                  <Input placeholder="e.g. 554" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="onvif_port" label="ONVIF Port">
                  <Input placeholder="e.g. 80" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="rtsp_tested" label="RTSP Tested" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="onvif_tested" label="ONVIF Tested" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="integration_notes" label="Integration Notes">
              <TextArea rows={3} placeholder="Any notes about the integration..." />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}
