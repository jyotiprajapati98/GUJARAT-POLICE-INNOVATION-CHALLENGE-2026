import React, { useEffect, useState } from 'react'
import {
  Row,
  Col,
  Card,
  Statistic,
  Button,
  List,
  Badge,
  Table,
  Typography,
  Space,
  Spin,
  Tag,
  Empty,
  message,
} from 'antd'
import {
  VideoCameraOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  BankOutlined,
  PlusOutlined,
  UploadOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { camerasAPI } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const { Title, Text } = Typography

const STATUS_COLOR = {
  active: 'green',
  inactive: 'default',
  faulty: 'red',
  under_maintenance: 'orange',
  decommissioned: 'black',
  planned: 'blue',
}

const STATUS_LABEL = {
  active: 'Active',
  inactive: 'Inactive',
  faulty: 'Faulty',
  under_maintenance: 'Under Maintenance',
  decommissioned: 'Decommissioned',
  planned: 'Planned',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentCameras, setRecentCameras] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [statsData, camerasData] = await Promise.all([
          camerasAPI.getStats(),
          camerasAPI.list({ limit: 5, page: 1 }),
        ])
        setStats(statsData)
        const cameras = Array.isArray(camerasData)
          ? camerasData
          : camerasData.items || camerasData.data || camerasData.cameras || []
        setRecentCameras(cameras.slice(0, 5))
      } catch {
        message.error('Failed to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const totalCameras = stats?.total || 0
  const activeCount = stats?.by_status?.active || 0
  const faultyCount = stats?.by_status?.faulty || 0
  const deptCount = stats?.by_department?.length || 0

  const statusRows = Object.entries(STATUS_LABEL).map(([key, label]) => ({
    key,
    label,
    count: stats?.by_status?.[key] || 0,
    color: STATUS_COLOR[key],
  }))

  const deptRows = (stats?.by_department || []).map((d, i) => ({
    key: i,
    dept_name: d.dept_name,
    count: d.count,
  }))

  const recentColumns = [
    {
      title: 'Camera ID',
      dataIndex: 'camera_id_label',
      key: 'camera_id_label',
      width: 140,
      render: (v) => <Text code style={{ fontSize: 12 }}>{v || '—'}</Text>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => (
        <Badge
          color={STATUS_COLOR[v] === 'default' ? 'gray' : STATUS_COLOR[v]}
          text={STATUS_LABEL[v] || v}
        />
      ),
    },
    {
      title: 'Added',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v) => v ? dayjs(v).format('DD MMM YYYY') : '—',
    },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #001529 0%, #003366 100%)',
          borderRadius: 12,
          padding: '24px 32px',
          marginBottom: 24,
          color: '#fff',
        }}
      >
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          Welcome back, {user?.full_name || user?.email || 'User'}
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.65)' }}>
          {user?.department?.name || 'System Administrator'} &bull;{' '}
          {dayjs().format('dddd, DD MMMM YYYY')}
        </Text>
      </div>

      {/* Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} xl={6}>
          <Card style={{ borderRadius: 10 }}>
            <Statistic
              title="Total Cameras"
              value={totalCameras}
              prefix={<VideoCameraOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card style={{ borderRadius: 10 }}>
            <Statistic
              title="Active Cameras"
              value={activeCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
              suffix={
                totalCameras > 0 ? (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {' '}({Math.round((activeCount / totalCameras) * 100)}%)
                  </Text>
                ) : null
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card style={{ borderRadius: 10 }}>
            <Statistic
              title="Faulty Cameras"
              value={faultyCount}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card style={{ borderRadius: 10 }}>
            <Statistic
              title="Departments"
              value={deptCount}
              prefix={<BankOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Cameras by Status */}
        <Col xs={24} md={12}>
          <Card
            title="Cameras by Status"
            style={{ borderRadius: 10 }}
            extra={
              <Button type="link" size="small" onClick={() => navigate('/cameras')}>
                View All <ArrowRightOutlined />
              </Button>
            }
          >
            {statusRows.every((r) => r.count === 0) ? (
              <Empty description="No data available" />
            ) : (
              <List
                dataSource={statusRows}
                renderItem={(item) => (
                  <List.Item
                    style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
                    extra={
                      <Tag
                        color={item.color === 'default' ? 'default' : item.color}
                        style={{ minWidth: 48, textAlign: 'center', fontWeight: 600 }}
                      >
                        {item.count}
                      </Tag>
                    }
                  >
                    <Space>
                      <Badge
                        color={item.color === 'default' ? 'gray' : item.color}
                        text={item.label}
                      />
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* Cameras by Department */}
        <Col xs={24} md={12}>
          <Card
            title="Cameras by Department"
            style={{ borderRadius: 10 }}
          >
            {deptRows.length === 0 ? (
              <Empty description="No department data available" />
            ) : (
              <Table
                dataSource={deptRows}
                size="small"
                pagination={false}
                showHeader={false}
                columns={[
                  {
                    dataIndex: 'dept_name',
                    key: 'dept_name',
                    render: (v) => <Text>{v}</Text>,
                  },
                  {
                    dataIndex: 'count',
                    key: 'count',
                    align: 'right',
                    render: (v) => (
                      <Tag color="blue" style={{ fontWeight: 600 }}>
                        {v}
                      </Tag>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Recent Cameras + Quick Actions */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title="Recently Added Cameras"
            style={{ borderRadius: 10 }}
            extra={
              <Button type="link" size="small" onClick={() => navigate('/cameras')}>
                View All <ArrowRightOutlined />
              </Button>
            }
          >
            {recentCameras.length === 0 ? (
              <Empty description="No cameras registered yet." />
            ) : (
              <Table
                dataSource={recentCameras}
                columns={recentColumns}
                rowKey="id"
                pagination={false}
                size="small"
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Quick Actions" style={{ borderRadius: 10 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                size="large"
                onClick={() => navigate('/cameras?action=add')}
                style={{ textAlign: 'left', height: 48 }}
              >
                Add New Camera
              </Button>
              <Button
                icon={<UploadOutlined />}
                block
                size="large"
                onClick={() => navigate('/cameras?action=import')}
                style={{ textAlign: 'left', height: 48 }}
              >
                Bulk Import CSV
              </Button>
              <Button
                icon={<EnvironmentOutlined />}
                block
                size="large"
                onClick={() => navigate('/map')}
                style={{ textAlign: 'left', height: 48 }}
              >
                View GIS Map
              </Button>
              <Button
                icon={<VideoCameraOutlined />}
                block
                size="large"
                onClick={() => navigate('/cameras')}
                style={{ textAlign: 'left', height: 48 }}
              >
                Camera Registry
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
