import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Tag,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
  Spin,
  Empty,
  Badge,
  Row,
  Col,
} from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { auditAPI } from '../services/api.js'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

const ACTION_COLORS = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  LOGIN: 'purple',
  BULK_IMPORT: 'orange',
}

const RESOURCE_TYPES = [
  'camera',
  'department',
  'user',
  'integration',
  'bulk_import',
]

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'BULK_IMPORT']

export default function AuditTrail() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [loading, setLoading] = useState(false)

  const [filters, setFilters] = useState({
    user_email: '',
    action: undefined,
    resource_type: undefined,
    dateRange: null,
  })

  const fetchLogs = useCallback(
    async (pg = 1, f = filters) => {
      setLoading(true)
      try {
        const params = { page: pg, limit: pageSize }
        if (f.user_email) params.user_email = f.user_email
        if (f.action) params.action = f.action
        if (f.resource_type) params.resource_type = f.resource_type
        if (f.dateRange && f.dateRange[0]) {
          params.from_date = f.dateRange[0].toISOString()
          params.to_date = f.dateRange[1].toISOString()
        }
        const data = await auditAPI.getLogs(params)
        if (Array.isArray(data)) {
          setLogs(data)
          setTotal(data.length)
        } else {
          setLogs(data.items || [])
          setTotal(data.total || 0)
        }
      } catch {
        setLogs([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [pageSize, filters]
  )

  useEffect(() => {
    fetchLogs(1, filters)
  }, []) // eslint-disable-line

  const handleSearch = () => {
    setPage(1)
    fetchLogs(1, filters)
  }

  const handleReset = () => {
    const reset = { user_email: '', action: undefined, resource_type: undefined, dateRange: null }
    setFilters(reset)
    setPage(1)
    fetchLogs(1, reset)
  }

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (v) => (v ? dayjs(v).format('DD MMM YYYY HH:mm') : '—'),
      sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      defaultSortOrder: 'descend',
    },
    {
      title: 'User',
      dataIndex: 'user_email',
      key: 'user_email',
      render: (v, r) => v || r.user || '—',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (v) => (
        <Tag color={ACTION_COLORS[v] || 'default'}>{v || 'UNKNOWN'}</Tag>
      ),
    },
    {
      title: 'Resource Type',
      dataIndex: 'resource_type',
      key: 'resource_type',
      render: (v) => v || '—',
    },
    {
      title: 'Resource ID',
      dataIndex: 'resource_id',
      key: 'resource_id',
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      key: 'ip_address',
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      render: (v) => {
        const success = v === 'success' || v === true || v === 'SUCCESS'
        return success ? (
          <Badge status="success" text="Success" />
        ) : (
          <Badge status="error" text="Failure" />
        )
      },
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>
        Audit Trail
      </Title>

      {/* Filter Bar */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Filter by user email"
              value={filters.user_email}
              onChange={(e) => setFilters((f) => ({ ...f, user_email: e.target.value }))}
              allowClear
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Action"
              allowClear
              style={{ width: '100%' }}
              value={filters.action}
              onChange={(v) => setFilters((f) => ({ ...f, action: v }))}
            >
              {ACTIONS.map((a) => (
                <Option key={a} value={a}>
                  <Tag color={ACTION_COLORS[a]}>{a}</Tag>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Resource Type"
              allowClear
              style={{ width: '100%' }}
              value={filters.resource_type}
              onChange={(v) => setFilters((f) => ({ ...f, resource_type: v }))}
            >
              {RESOURCE_TYPES.map((r) => (
                <Option key={r} value={r}>
                  {r}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={filters.dateRange}
              onChange={(dates) => setFilters((f) => ({ ...f, dateRange: dates }))}
              format="DD MMM YYYY"
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                Search
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                Reset
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Logs Table */}
      <Card>
        {loading && !logs.length ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            dataSource={logs}
            rowKey={(r) => r.id || r.log_id || Math.random()}
            columns={columns}
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: false,
              onChange: (pg) => {
                setPage(pg)
                fetchLogs(pg, filters)
              },
            }}
            size="small"
            scroll={{ x: 1000 }}
            locale={{ emptyText: <Empty description="No audit logs found" /> }}
          />
        )}
      </Card>
    </div>
  )
}
