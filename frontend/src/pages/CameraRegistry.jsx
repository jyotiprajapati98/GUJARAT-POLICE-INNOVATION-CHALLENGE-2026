import React, { useEffect, useState, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  message,
  Row,
  Col,
  Card,
  Typography,
  Badge,
} from 'antd'
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { camerasAPI, departmentsAPI } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import CameraForm from '../components/Camera/CameraForm.jsx'
import CameraDetail from '../components/Camera/CameraDetail.jsx'
import BulkImport from '../components/Camera/BulkImport.jsx'

const { Search } = Input
const { Text } = Typography

const STATUS_COLOR = {
  active: 'green',
  inactive: 'default',
  faulty: 'red',
  under_maintenance: 'orange',
  decommissioned: 'volcano',
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

const TYPE_EMOJI = {
  dome: '🔵',
  bullet: '🟡',
  ptz: '🔴',
  fisheye: '🟣',
  box: '⬜',
  thermal: '🔶',
  other: '⚪',
}

export default function CameraRegistry() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasRole } = useAuth()

  const [cameras, setCameras] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Filters
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [typeFilter, setTypeFilter] = useState(null)

  // Modals
  const [viewCamera, setViewCamera] = useState(null)
  const [editCamera, setEditCamera] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [highlightId, setHighlightId] = useState(null)

  const canEdit = hasRole(['super_admin', 'dept_admin', 'operator'])
  const canDelete = hasRole(['super_admin', 'dept_admin'])

  const fetchCameras = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: pageSize,
        ...(search && { search }),
        ...(deptFilter && { department_id: deptFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { camera_type: typeFilter }),
      }
      const data = await camerasAPI.list(params)
      if (Array.isArray(data)) {
        setCameras(data)
        setTotal(data.length)
      } else {
        setCameras(data.items || data.data || data.cameras || [])
        setTotal(data.total || 0)
      }
    } catch {
      message.error('Failed to load cameras.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, deptFilter, statusFilter, typeFilter])

  useEffect(() => {
    fetchCameras()
  }, [fetchCameras])

  useEffect(() => {
    departmentsAPI.list().then((data) => {
      const list = Array.isArray(data) ? data : data.items || data.data || []
      setDepartments(list)
    })
  }, [])

  // Handle URL action param (from dashboard quick actions)
  useEffect(() => {
    const action = searchParams.get('action')
    const cid = searchParams.get('camera_id')
    if (action === 'add') {
      setShowAddForm(true)
      setSearchParams({})
    } else if (action === 'import') {
      setShowBulkImport(true)
      setSearchParams({})
    }
    if (cid) {
      setHighlightId(cid)
    }
  }, [searchParams, setSearchParams])

  const handleDelete = async (id) => {
    try {
      await camerasAPI.remove(id)
      message.success('Camera deleted successfully.')
      fetchCameras()
    } catch {
      message.error('Failed to delete camera.')
    }
  }

  const handleExportCSV = async () => {
    try {
      const blob = await camerasAPI.exportCSV()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cameras_export_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      message.success('CSV export downloaded.')
    } catch {
      message.error('Failed to export CSV.')
    }
  }

  const resetFilters = () => {
    setSearch('')
    setDeptFilter(null)
    setStatusFilter(null)
    setTypeFilter(null)
    setPage(1)
  }

  const columns = [
    {
      title: 'Camera ID',
      dataIndex: 'camera_id_label',
      key: 'camera_id_label',
      width: 140,
      render: (v, record) => (
        <Text
          code
          style={{
            fontSize: 12,
            background: record.id === highlightId ? '#e6f4ff' : undefined,
          }}
        >
          {v || '—'}
        </Text>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: 'Department',
      dataIndex: ['department', 'name'],
      key: 'department',
      ellipsis: true,
      render: (v, record) => v || record.department_name || '—',
    },
    {
      title: 'Type',
      dataIndex: 'camera_type',
      key: 'camera_type',
      width: 120,
      render: (v) => (
        <Tag>
          {TYPE_EMOJI[v] || '⚪'} {v ? v.charAt(0).toUpperCase() + v.slice(1) : '—'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (v) => (
        <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] || v}</Tag>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      ellipsis: true,
      render: (_, record) => {
        const parts = [record.area, record.city].filter(Boolean)
        return parts.join(', ') || record.address || '—'
      },
    },
    {
      title: 'Install Date',
      dataIndex: 'installation_date',
      key: 'installation_date',
      width: 120,
      render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => setViewCamera(record)}
            />
          </Tooltip>
          {canEdit && (
            <Tooltip title="Edit">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => setEditCamera(record)}
              />
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Delete">
              <Popconfirm
                title="Delete Camera"
                description={`Are you sure you want to delete "${record.name}"?`}
                onConfirm={() => handleDelete(record.id)}
                okText="Delete"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
              >
                <Button type="text" icon={<DeleteOutlined />} size="small" danger />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* Filter Bar */}
      <Card style={{ marginBottom: 16, borderRadius: 10 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="Search by name, ID, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={() => { setPage(1); fetchCameras() }}
              allowClear
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="Department"
              value={deptFilter}
              onChange={(v) => { setDeptFilter(v); setPage(1) }}
              allowClear
              style={{ width: '100%' }}
              options={departments.map((d) => ({ label: d.name, value: d.id }))}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Status"
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1) }}
              allowClear
              style={{ width: '100%' }}
              options={Object.entries(STATUS_LABEL).map(([k, v]) => ({ label: v, value: k }))}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Camera Type"
              value={typeFilter}
              onChange={(v) => { setTypeFilter(v); setPage(1) }}
              allowClear
              style={{ width: '100%' }}
              options={[
                { label: '🔵 Dome', value: 'dome' },
                { label: '🟡 Bullet', value: 'bullet' },
                { label: '🔴 PTZ', value: 'ptz' },
                { label: '🟣 Fisheye', value: 'fisheye' },
                { label: '⬜ Box', value: 'box' },
                { label: '🔶 Thermal', value: 'thermal' },
                { label: '⚪ Other', value: 'other' },
              ]}
            />
          </Col>
          <Col xs={24} sm={24} md={5}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={resetFilters}>
                Reset
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Action Buttons */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Text type="secondary">
            {total} camera{total !== 1 ? 's' : ''} found
          </Text>
        </Col>
        <Col>
          <Space>
            {canEdit && (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setShowAddForm(true)}
                >
                  Add Camera
                </Button>
                <Button icon={<UploadOutlined />} onClick={() => setShowBulkImport(true)}>
                  Bulk Import
                </Button>
              </>
            )}
            <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
              Export CSV
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Table */}
      <Card style={{ borderRadius: 10 }}>
        <Table
          columns={columns}
          dataSource={cameras}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          rowClassName={(record) =>
            record.id === highlightId ? 'highlighted-row' : ''
          }
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} cameras`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      {/* View Modal */}
      {viewCamera && (
        <CameraDetail
          camera={viewCamera}
          onClose={() => setViewCamera(null)}
        />
      )}

      {/* Add/Edit Form Modal */}
      {(showAddForm || editCamera) && (
        <CameraForm
          camera={editCamera}
          departments={departments}
          onClose={() => {
            setShowAddForm(false)
            setEditCamera(null)
          }}
          onSuccess={() => {
            setShowAddForm(false)
            setEditCamera(null)
            fetchCameras()
          }}
        />
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImport
          departments={departments}
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => {
            setShowBulkImport(false)
            fetchCameras()
          }}
        />
      )}
    </div>
  )
}
