import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Row, Col, Card, Statistic, Table, Button, Input, Switch, Space,
  Badge, Typography, Tag, notification, Empty, message,
} from 'antd'
import { SearchOutlined, CarOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { analyticsAPI } from '../services/api.js'

dayjs.extend(relativeTime)

const { Title, Text } = Typography

export default function AlertsDashboard() {
  const navigate = useNavigate()
  const [connected, setConnected] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [tableLoading, setTableLoading] = useState(false)
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0)
  const [totalToday, setTotalToday] = useState(0)
  const [showAcknowledged, setShowAcknowledged] = useState(false)
  const [plateFilter, setPlateFilter] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const wsRef = useRef(null)
  const refreshTimerRef = useRef(null)

  const fetchAlerts = useCallback(async (page = 1, pageSize = 20) => {
    setTableLoading(true)
    try {
      const params = { page, limit: pageSize }
      if (!showAcknowledged) params.acknowledged = false
      if (plateFilter) params.plate_text = plateFilter.toUpperCase()
      const data = await analyticsAPI.getAlerts(params)
      const items = Array.isArray(data) ? data : (data.items ?? [])
      setAlerts(items)
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize,
        total: data.total ?? items.length,
      }))

      // update unacknowledged count from response meta or recount
      if (typeof data.unacknowledged_count === 'number') {
        setUnacknowledgedCount(data.unacknowledged_count)
      } else {
        const unack = items.filter((a) => !a.acknowledged).length
        setUnacknowledgedCount(unack)
      }
      if (typeof data.total_today === 'number') setTotalToday(data.total_today)
    } catch {
      message.error('Failed to load alerts')
    } finally {
      setTableLoading(false)
    }
  }, [showAcknowledged, plateFilter])

  // Initial load and filter-driven refresh
  useEffect(() => {
    fetchAlerts(1, pagination.pageSize)
  }, [showAcknowledged, plateFilter]) // eslint-disable-line

  // Auto-refresh every 30 seconds
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      fetchAlerts(pagination.current, pagination.pageSize)
    }, 30000)
    return () => clearInterval(refreshTimerRef.current)
  }, [fetchAlerts, pagination.current, pagination.pageSize])

  // WebSocket
  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}/ws/alerts`)

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'alert') {
          notification.warning({
            message: `Vehicle Alert: ${data.plate_text}`,
            description: `Spotted at ${data.camera_id_label} — ${data.reason}`,
            duration: 10,
            onClick: () => navigate(`/vehicle-route/${data.plate_text}`),
          })
          setUnacknowledgedCount((c) => c + 1)
          fetchAlerts(1, pagination.pageSize)
        }
      } catch {
        // ignore non-JSON messages (e.g. pong)
      }
    }

    wsRef.current = ws

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping')
    }, 30000)

    return () => {
      clearInterval(ping)
      ws.close()
    }
  }, []) // eslint-disable-line

  const handleAcknowledge = async (record) => {
    try {
      await analyticsAPI.acknowledgeAlert(record.id)
      message.success('Alert acknowledged')
      setUnacknowledgedCount((c) => Math.max(0, c - 1))
      fetchAlerts(pagination.current, pagination.pageSize)
    } catch {
      message.error('Failed to acknowledge alert')
    }
  }

  const columns = [
    {
      title: 'Status',
      dataIndex: 'acknowledged',
      key: 'acknowledged',
      render: (v) =>
        v ? (
          <Badge status="success" text="Acknowledged" />
        ) : (
          <Badge status="error" text="Unacknowledged" />
        ),
    },
    {
      title: 'Plate',
      dataIndex: 'plate_text',
      key: 'plate_text',
      render: (v) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#cf1322', fontSize: 14 }}>
          {(v ?? '').toUpperCase()}
        </span>
      ),
    },
    {
      title: 'Camera',
      dataIndex: 'camera_id',
      key: 'camera_id',
      render: (v, r) => r.camera_id_label ?? v ?? '—',
    },
    {
      title: 'Location',
      dataIndex: 'location_name',
      key: 'location_name',
      render: (v) => v ?? '—',
    },
    {
      title: 'Triggered At',
      dataIndex: 'triggered_at',
      key: 'triggered_at',
      render: (v) => v ? dayjs(v).fromNow() : '—',
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {!record.acknowledged && (
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleAcknowledge(record)}
            >
              Acknowledge
            </Button>
          )}
          <Button
            size="small"
            icon={<CarOutlined />}
            onClick={() => navigate(`/vehicle-route/${record.plate_text}`)}
          >
            View Route
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* Connection status bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          padding: '8px 16px',
          background: '#fff',
          borderRadius: 8,
          border: `1px solid ${connected ? '#b7eb8f' : '#ffa39e'}`,
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: connected ? '#52c41a' : '#f5222d',
            display: 'inline-block',
          }}
        />
        <Text strong style={{ color: connected ? '#52c41a' : '#f5222d' }}>
          {connected ? 'Connected — Real-time alerts active' : 'Disconnected — Real-time alerts unavailable'}
        </Text>
      </div>

      <Title level={3} style={{ marginBottom: 16 }}>Alerts Dashboard</Title>

      {/* Stats row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Unacknowledged Alerts"
              value={unacknowledgedCount}
              valueStyle={{ color: '#cf1322' }}
              prefix={<Badge count={unacknowledgedCount} overflowCount={999} offset={[4, -4]} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Alerts Today" value={totalToday} />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size={12}>
          <Input
            placeholder="Filter by plate"
            prefix={<SearchOutlined />}
            value={plateFilter}
            onChange={(e) => setPlateFilter(e.target.value.toUpperCase())}
            style={{ width: 200 }}
            allowClear
          />
          <Space>
            <Text>Show acknowledged</Text>
            <Switch checked={showAcknowledged} onChange={setShowAcknowledged} size="small" />
          </Space>
        </Space>
      </Card>

      {/* Alerts table */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={alerts}
        loading={tableLoading}
        locale={{ emptyText: <Empty description="No alerts found" /> }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `${total} alerts`,
        }}
        onChange={(pag) => fetchAlerts(pag.current, pag.pageSize)}
        size="middle"
        scroll={{ x: 900 }}
        rowClassName={(r) => (!r.acknowledged ? 'alert-row-unack' : '')}
      />
    </div>
  )
}
