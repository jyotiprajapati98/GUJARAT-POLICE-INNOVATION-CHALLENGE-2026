import React, { useState, useEffect } from 'react'
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Typography,
  Spin,
  Empty,
  Progress,
  Button,
  Space,
  message,
} from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { gapAnalysisAPI } from '../services/api.js'

const { Title, Text } = Typography

function downloadCSV(data, filename) {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function buildCSV(flaggedCameras) {
  const headers = ['Camera ID', 'Name', 'Department', 'Status', 'Issues']
  const rows = flaggedCameras.map((c) => [
    c.camera_id_label || c.id || '',
    c.name || '',
    c.dept_name || c.department?.name || '',
    c.status || '',
    (c.issues || c.flags || []).join('; '),
  ])
  return [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export default function GapAnalysis() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    gapAnalysisAPI
      .getReport()
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
  }, [])

  const summary = report?.summary || {}
  const byDept = report?.by_department || []
  const flaggedCameras = report?.flagged_cameras || []

  const statCards = [
    {
      title: 'Total Cameras',
      value: summary.total_cameras ?? 0,
      color: '#e6f4ff',
    },
    {
      title: 'Operational',
      value: summary.operational ?? 0,
      sub: summary.total_cameras
        ? `${Math.round(((summary.operational ?? 0) / summary.total_cameras) * 100)}% coverage`
        : '',
      color: '#f6ffed',
    },
    {
      title: 'Non-Operational',
      value: summary.non_operational ?? 0,
      color: '#fff2f0',
    },
    {
      title: 'No Analytics',
      value: summary.no_analytics ?? 0,
      color: '#fff7e6',
    },
    {
      title: 'No Night Vision',
      value: summary.no_night_vision ?? 0,
      color: '#f9f0ff',
    },
    {
      title: 'Warranty Expiring (90d)',
      value: summary.warranty_expiring ?? 0,
      color: '#feffe6',
    },
  ]

  const deptColumns = [
    { title: 'Department', dataIndex: 'department', key: 'department', render: (v) => v || '—' },
    { title: 'Total', dataIndex: 'total', key: 'total', align: 'center' },
    {
      title: 'Active',
      dataIndex: 'active',
      key: 'active',
      align: 'center',
      render: (v) => <Text style={{ color: '#52c41a' }}>{v ?? 0}</Text>,
    },
    {
      title: 'Faulty',
      dataIndex: 'faulty',
      key: 'faulty',
      align: 'center',
      render: (v) => <Text style={{ color: '#ff4d4f' }}>{v ?? 0}</Text>,
    },
    {
      title: 'Inactive',
      dataIndex: 'inactive',
      key: 'inactive',
      align: 'center',
      render: (v) => <Text style={{ color: '#8c8c8c' }}>{v ?? 0}</Text>,
    },
    {
      title: 'Analytics',
      dataIndex: 'with_analytics',
      key: 'with_analytics',
      align: 'center',
      render: (v) => v ?? 0,
    },
    {
      title: 'Night Vision',
      dataIndex: 'with_night_vision',
      key: 'with_night_vision',
      align: 'center',
      render: (v) => v ?? 0,
    },
    {
      title: 'Coverage %',
      key: 'coverage',
      align: 'center',
      width: 160,
      render: (_, row) => {
        const pct = row.coverage_percentage ?? (row.total ? Math.round(((row.active || 0) / row.total) * 100) : 0)
        return (
          <Progress
            percent={Math.round(pct)}
            size="small"
            strokeColor={pct >= 80 ? '#52c41a' : pct >= 50 ? '#fa8c16' : '#ff4d4f'}
          />
        )
      },
    },
    {
      title: 'Gap Flags',
      dataIndex: 'gap_flags',
      key: 'gap_flags',
      render: (flags) =>
        flags && flags.length > 0 ? (
          <Space size={4} wrap>
            {flags.map((f, i) => (
              <Tag key={i} color="red" style={{ marginBottom: 2 }}>
                {f}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ]

  const flaggedColumns = [
    {
      title: 'Camera ID',
      dataIndex: 'camera_id_label',
      key: 'camera_id_label',
      width: 120,
      render: (v, r) => v || r.id,
    },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Department',
      dataIndex: 'dept_name',
      key: 'dept_name',
      render: (v, r) => v || r.department?.name || '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => {
        const colorMap = { active: 'green', inactive: 'default', faulty: 'red', under_maintenance: 'orange' }
        return <Tag color={colorMap[v] || 'default'}>{v || 'Unknown'}</Tag>
      },
    },
    {
      title: 'Issues',
      key: 'issues',
      render: (_, row) => {
        const issues = row.issues || row.flags || []
        if (!issues.length) return <Text type="secondary">—</Text>
        return (
          <Space size={4} wrap>
            {issues.map((issue, i) => {
              const isWarning = /night|analytics|warranty|coverage/i.test(issue)
              return (
                <Tag key={i} color={isWarning ? 'orange' : 'red'}>
                  {issue}
                </Tag>
              )
            })}
          </Space>
        )
      },
    },
  ]

  const handleExport = () => {
    if (!flaggedCameras.length) {
      message.warning('No flagged cameras to export')
      return
    }
    const csv = buildCSV(flaggedCameras)
    downloadCSV(csv, `gap-analysis-${dayjs().format('YYYY-MM-DD')}.csv`)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!report) {
    return (
      <Card>
        <Empty description="Gap analysis report is unavailable" />
      </Card>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>
          Gap Analysis
        </Title>
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card) => (
          <Col xs={12} sm={12} md={8} lg={4} key={card.title}>
            <Card style={{ background: card.color, borderColor: 'transparent', height: '100%' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{card.value}</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{card.title}</div>
              {card.sub && (
                <div style={{ fontSize: 11, color: '#52c41a', marginTop: 2 }}>{card.sub}</div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {/* Department Coverage */}
      <Card title="Department Coverage" style={{ marginBottom: 24 }}>
        {byDept.length > 0 ? (
          <Table
            dataSource={byDept}
            rowKey={(r) => r.department || r.dept_name || Math.random()}
            columns={deptColumns}
            pagination={false}
            size="small"
            scroll={{ x: 900 }}
          />
        ) : (
          <Empty description="No department data available" />
        )}
      </Card>

      {/* Flagged Cameras */}
      <Card title={`Flagged Cameras (${flaggedCameras.length})`}>
        {flaggedCameras.length > 0 ? (
          <Table
            dataSource={flaggedCameras}
            rowKey={(r) => r.id || r.camera_id_label || Math.random()}
            columns={flaggedColumns}
            pagination={{ pageSize: 20 }}
            size="small"
            locale={{ emptyText: <Empty description="No flagged cameras" /> }}
          />
        ) : (
          <Empty description="No flagged cameras" />
        )}
      </Card>
    </div>
  )
}
