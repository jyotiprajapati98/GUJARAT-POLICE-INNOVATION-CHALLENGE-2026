import React, { useState, useEffect, useCallback } from 'react'
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Select,
  Space,
  Typography,
  Spin,
  Empty,
  Alert,
  Progress,
  Badge,
  Button,
  Statistic,
} from 'antd'
import {
  VideoCameraOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  QuestionCircleFilled,
  ToolFilled,
  WifiOutlined,
  DisconnectOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { healthAPI, departmentsAPI } from '../services/api.js'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography
const { Option } = Select

const STATUS_CONFIG = {
  online: { color: 'green', label: 'Online', icon: <CheckCircleFilled style={{ color: '#52c41a' }} /> },
  offline: { color: 'red', label: 'Offline', icon: <CloseCircleFilled style={{ color: '#ff4d4f' }} /> },
  degraded: { color: 'orange', label: 'Degraded', icon: <ExclamationCircleFilled style={{ color: '#fa8c16' }} /> },
  maintenance: { color: 'blue', label: 'Maintenance', icon: <ToolFilled style={{ color: '#1677ff' }} /> },
  unknown: { color: 'default', label: 'Unknown', icon: <QuestionCircleFilled style={{ color: '#8c8c8c' }} /> },
}

export default function HealthDashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [cameras, setCameras] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [departments, setDepartments] = useState([])
  const [filters, setFilters] = useState({ status: undefined, dept: undefined, connected: undefined })

  const fetchSummary = useCallback(async () => {
    try {
      const data = await healthAPI.getSummary()
      setSummary(data)
    } catch {
      setSummary(null)
    }
  }, [])

  const fetchCameras = useCallback(async (pg = 1, f = filters) => {
    setTableLoading(true)
    try {
      const params = { page: pg, limit: pageSize }
      if (f.status) params.status = f.status
      if (f.dept) params.department_id = f.dept
      if (f.connected !== undefined && f.connected !== '') params.connected = f.connected
      const data = await healthAPI.getCameras(params)
      if (Array.isArray(data)) {
        setCameras(data)
        setTotal(data.length)
      } else {
        setCameras(data.items || [])
        setTotal(data.total || 0)
      }
    } catch {
      setCameras([])
      setTotal(0)
    } finally {
      setTableLoading(false)
    }
  }, [pageSize, filters])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [, depts] = await Promise.allSettled([fetchSummary(), departmentsAPI.list()])
        if (depts.status === 'fulfilled') {
          const d = depts.value
          setDepartments(Array.isArray(d) ? d : d.items || [])
        }
      } finally {
        setLoading(false)
      }
      fetchCameras(1, filters)
    }
    init()
  }, []) // eslint-disable-line

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    setPage(1)
    fetchCameras(1, newFilters)
  }

  const statCards = summary
    ? [
        {
          title: 'Total Cameras',
          value: summary.total_cameras ?? 0,
          icon: <VideoCameraOutlined style={{ fontSize: 28, color: '#1677ff' }} />,
          color: '#e6f4ff',
        },
        {
          title: 'Online',
          value: summary.online ?? 0,
          icon: <CheckCircleFilled style={{ fontSize: 28, color: '#52c41a' }} />,
          color: '#f6ffed',
        },
        {
          title: 'Offline',
          value: summary.offline ?? 0,
          icon: <CloseCircleFilled style={{ fontSize: 28, color: '#ff4d4f' }} />,
          color: '#fff2f0',
        },
        {
          title: 'Degraded / Faulty',
          value: summary.degraded ?? 0,
          icon: <ExclamationCircleFilled style={{ fontSize: 28, color: '#fa8c16' }} />,
          color: '#fff7e6',
        },
        {
          title: 'Unknown',
          value: summary.unknown ?? 0,
          icon: <QuestionCircleFilled style={{ fontSize: 28, color: '#8c8c8c' }} />,
          color: '#fafafa',
        },
      ]
    : []

  const alerts = summary?.alerts || []

  const byDeptColumns = [
    { title: 'Department', dataIndex: 'department', key: 'department', render: (v) => v || '—' },
    { title: 'Total', dataIndex: 'total', key: 'total', align: 'center' },
    {
      title: 'Online',
      dataIndex: 'online',
      key: 'online',
      align: 'center',
      render: (v) => <Text style={{ color: '#52c41a' }}>{v ?? 0}</Text>,
    },
    {
      title: 'Offline',
      dataIndex: 'offline',
      key: 'offline',
      align: 'center',
      render: (v) => <Text style={{ color: '#ff4d4f' }}>{v ?? 0}</Text>,
    },
    {
      title: 'Degraded',
      dataIndex: 'degraded',
      key: 'degraded',
      align: 'center',
      render: (v) => <Text style={{ color: '#fa8c16' }}>{v ?? 0}</Text>,
    },
    {
      title: 'Health %',
      key: 'health',
      align: 'center',
      render: (_, row) => {
        const total = row.total || 1
        const online = row.online || 0
        const pct = Math.round((online / total) * 100)
        return (
          <Progress
            percent={pct}
            size="small"
            strokeColor={pct >= 80 ? '#52c41a' : pct >= 50 ? '#fa8c16' : '#ff4d4f'}
          />
        )
      },
    },
  ]

  const cameraColumns = [
    { title: 'Camera ID', dataIndex: 'camera_id_label', key: 'camera_id_label', width: 120, render: (v, r) => v || r.id },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Department', dataIndex: 'dept_name', key: 'dept_name', render: (v, r) => v || r.department?.name || '—' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => {
        const cfg = STATUS_CONFIG[v] || STATUS_CONFIG.unknown
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      },
    },
    {
      title: 'Connected',
      dataIndex: 'connected',
      key: 'connected',
      align: 'center',
      render: (v) =>
        v ? (
          <WifiOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        ) : (
          <DisconnectOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
        ),
    },
    {
      title: 'Last Checked',
      dataIndex: 'last_checked_at',
      key: 'last_checked_at',
      render: (v) => (v ? dayjs(v).format('DD MMM YYYY HH:mm') : <Text type="secondary">Never</Text>),
    },
    {
      title: 'Uptime %',
      dataIndex: 'uptime_percentage',
      key: 'uptime_percentage',
      align: 'center',
      render: (v) =>
        v != null ? (
          <Progress
            percent={Math.round(v)}
            size="small"
            strokeColor={v >= 80 ? '#52c41a' : v >= 50 ? '#fa8c16' : '#ff4d4f'}
          />
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Fault',
      dataIndex: 'fault_description',
      key: 'fault_description',
      render: (v) => v ? <Text type="danger">{v}</Text> : <Text type="secondary">—</Text>,
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
        Health Dashboard
      </Title>

      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card) => (
          <Col xs={12} sm={12} md={8} lg={4} xl={4} key={card.title}>
            <Card style={{ background: card.color, borderColor: 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {card.icon}
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{card.value}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>{card.title}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card
          title="Active Alerts"
          style={{ marginBottom: 24 }}
          bodyStyle={{ padding: 0 }}
        >
          <Table
            dataSource={alerts}
            rowKey={(r) => r.camera_id || r.id || Math.random()}
            pagination={false}
            size="small"
            columns={[
              { title: 'Camera ID', dataIndex: 'camera_id_label', key: 'camera_id_label', render: (v, r) => v || r.id },
              { title: 'Name', dataIndex: 'name', key: 'name' },
              { title: 'Department', dataIndex: 'dept_name', key: 'dept_name', render: (v, r) => v || r.department?.name || '—' },
              {
                title: 'Issue',
                dataIndex: 'issue',
                key: 'issue',
                render: (v, r) => (
                  <Text type="danger">{v || r.fault_description || 'Camera alert'}</Text>
                ),
              },
              {
                title: 'Action',
                key: 'action',
                render: (_, r) => (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => navigate(`/cameras?highlight=${r.camera_id || r.id}`)}
                  >
                    View Camera
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* By Department */}
      <Card title="Health by Department" style={{ marginBottom: 24 }}>
        {summary?.by_department?.length > 0 ? (
          <Table
            dataSource={summary.by_department}
            rowKey={(r) => r.department || r.dept_name || Math.random()}
            columns={byDeptColumns}
            pagination={false}
            size="small"
          />
        ) : (
          <Empty description="No department data available" />
        )}
      </Card>

      {/* Camera Health Table */}
      <Card
        title="Camera Health"
        extra={
          <Space>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 130 }}
              value={filters.status}
              onChange={(v) => handleFilterChange('status', v)}
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <Option key={k} value={k}>
                  {v.label}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Department"
              allowClear
              style={{ width: 150 }}
              value={filters.dept}
              onChange={(v) => handleFilterChange('dept', v)}
            >
              {departments.map((d) => (
                <Option key={d.id} value={d.id}>
                  {d.name}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Connected"
              allowClear
              style={{ width: 120 }}
              value={filters.connected}
              onChange={(v) => handleFilterChange('connected', v)}
            >
              <Option value="true">Connected</Option>
              <Option value="false">Disconnected</Option>
            </Select>
          </Space>
        }
      >
        <Table
          dataSource={cameras}
          rowKey={(r) => r.id || r.camera_id_label || Math.random()}
          columns={cameraColumns}
          loading={tableLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (pg) => {
              setPage(pg)
              fetchCameras(pg, filters)
            },
          }}
          size="small"
          locale={{ emptyText: <Empty description="No cameras found" /> }}
        />
      </Card>
    </div>
  )
}
