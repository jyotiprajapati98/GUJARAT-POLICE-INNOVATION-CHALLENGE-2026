import React, { useEffect, useState, useCallback } from 'react'
import {
  Select,
  Button,
  Space,
  Typography,
  Spin,
  Card,
  Badge,
  Drawer,
  message,
  Tag,
  Divider,
  Statistic,
  Row,
  Col,
} from 'antd'
import {
  FilterOutlined,
  ReloadOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { gisAPI, departmentsAPI } from '../services/api.js'
import MapView from '../components/Map/MapView.jsx'

const { Title, Text } = Typography

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

const STATUS_COLOR = {
  active: 'green',
  inactive: 'default',
  faulty: 'red',
  under_maintenance: 'orange',
  decommissioned: 'volcano',
  planned: 'blue',
}

const STATUS_DOT_COLOR = {
  active: '#52c41a',
  inactive: '#8c8c8c',
  faulty: '#ff4d4f',
  under_maintenance: '#fa8c16',
  decommissioned: '#434343',
  planned: '#1677ff',
}

export default function CameraMap() {
  const navigate = useNavigate()
  const [geoData, setGeoData] = useState(null)
  const [filteredData, setFilteredData] = useState(null)
  const [departments, setDepartments] = useState([])
  const [deptSummary, setDeptSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Filters
  const [deptFilter, setDeptFilter] = useState([])
  const [statusFilter, setStatusFilter] = useState([])
  const [typeFilter, setTypeFilter] = useState([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [geo, depts, summary] = await Promise.all([
        gisAPI.getCamerasGeoJSON(),
        departmentsAPI.list(),
        gisAPI.getDepartmentsSummary(),
      ])
      setGeoData(geo)
      setFilteredData(geo)
      const deptList = Array.isArray(depts) ? depts : depts.items || depts.data || []
      setDepartments(deptList)
      setDeptSummary(Array.isArray(summary) ? summary : [])
    } catch {
      message.error('Failed to load map data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Apply filters whenever filter state changes
  useEffect(() => {
    if (!geoData) return
    if (!deptFilter.length && !statusFilter.length && !typeFilter.length) {
      setFilteredData(geoData)
      return
    }
    const features = (geoData.features || []).filter((f) => {
      const p = f.properties || {}
      if (deptFilter.length && !deptFilter.includes(p.department_id)) return false
      if (statusFilter.length && !statusFilter.includes(p.status)) return false
      if (typeFilter.length && !typeFilter.includes(p.camera_type)) return false
      return true
    })
    setFilteredData({ ...geoData, features })
  }, [geoData, deptFilter, statusFilter, typeFilter])

  const resetFilters = () => {
    setDeptFilter([])
    setStatusFilter([])
    setTypeFilter([])
  }

  const handleCameraClick = (camera) => {
    navigate(`/cameras?camera_id=${camera.camera_id_label || camera.id}`)
  }

  const totalVisible = filteredData?.features?.length || 0
  const totalAll = geoData?.features?.length || 0

  // Status breakdown for legend
  const statusCounts = {}
  if (filteredData?.features) {
    filteredData.features.forEach((f) => {
      const s = f.properties?.status || 'unknown'
      statusCounts[s] = (statusCounts[s] || 0) + 1
    })
  }

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 112px)', display: 'flex' }}>
      {/* Filter Sidebar */}
      <div
        style={{
          width: sidebarOpen ? 280 : 0,
          minWidth: sidebarOpen ? 280 : 0,
          overflow: 'hidden',
          transition: 'width 0.2s, min-width 0.2s',
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
        }}
      >
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          <Title level={5} style={{ margin: '0 0 16px' }}>
            <FilterOutlined /> Map Filters
          </Title>

          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
              DEPARTMENT
            </Text>
            <Select
              mode="multiple"
              placeholder="All Departments"
              value={deptFilter}
              onChange={setDeptFilter}
              style={{ width: '100%' }}
              maxTagCount={2}
              options={departments.map((d) => ({ label: d.name, value: d.id }))}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
              STATUS
            </Text>
            <Select
              mode="multiple"
              placeholder="All Statuses"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              maxTagCount={2}
              options={STATUS_OPTIONS}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
              CAMERA TYPE
            </Text>
            <Select
              mode="multiple"
              placeholder="All Types"
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: '100%' }}
              maxTagCount={2}
              options={TYPE_OPTIONS}
            />
          </div>

          <Button block onClick={resetFilters} icon={<ReloadOutlined />}>
            Reset Filters
          </Button>

          <Divider style={{ margin: '16px 0' }} />

          {/* Stats */}
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              SHOWING {totalVisible} of {totalAll} CAMERAS
            </Text>
          </div>

          {/* Legend */}
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              STATUS LEGEND
            </Text>
            {STATUS_OPTIONS.map(({ label, value }) => (
              <div
                key={value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <Space size={6}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: STATUS_DOT_COLOR[value] || '#8c8c8c',
                      border: '2px solid rgba(0,0,0,0.2)',
                    }}
                  />
                  <Text style={{ fontSize: 12 }}>{label}</Text>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {statusCounts[value] || 0}
                </Text>
              </div>
            ))}
          </div>

          {deptSummary.length > 0 && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                DEPARTMENT SUMMARY
              </Text>
              {deptSummary.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                    fontSize: 12,
                  }}
                >
                  <Text ellipsis style={{ fontSize: 12, maxWidth: 160 }}>
                    {d.department_name}
                  </Text>
                  <Space size={4}>
                    <Tag color="blue" style={{ fontSize: 11, padding: '0 4px' }}>
                      {d.camera_count}
                    </Tag>
                  </Space>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Toggle Sidebar Button */}
      <Button
        type="text"
        icon={sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'absolute',
          left: sidebarOpen ? 280 : 0,
          top: 12,
          zIndex: 20,
          background: '#fff',
          border: '1px solid #d9d9d9',
          borderLeft: sidebarOpen ? 'none' : '1px solid #d9d9d9',
          borderRadius: sidebarOpen ? '0 4px 4px 0' : '0 4px 4px 0',
          transition: 'left 0.2s',
          boxShadow: '2px 0 6px rgba(0,0,0,0.08)',
        }}
      />

      {/* Map Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f5f5f5',
              zIndex: 5,
            }}
          >
            <Spin size="large" tip="Loading map data..." />
          </div>
        ) : (
          <MapView
            cameras={filteredData}
            onCameraClick={handleCameraClick}
          />
        )}
      </div>
    </div>
  )
}
