import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Row, Col, Card, Statistic, Table, Button, Input, DatePicker,
  Modal, Descriptions, Tag, Space, Spin, Empty, List, Typography,
  message, Upload, Progress, Alert, Divider,
} from 'antd'
import {
  SearchOutlined, ReloadOutlined, CameraOutlined,
  CarOutlined, EyeOutlined, UploadOutlined, ExperimentOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { analyticsAPI } from '../services/api.js'

const { RangePicker } = DatePicker
const { Text, Title } = Typography

function confidenceColor(conf) {
  if (conf >= 0.9) return 'green'
  if (conf >= 0.7) return 'orange'
  return 'red'
}

function confidenceLabel(conf) {
  const pct = Math.round((conf ?? 0) * 100)
  return <Tag color={confidenceColor(conf)}>{pct}%</Tag>
}

export default function ANPRSearch() {
  const navigate = useNavigate()

  // Stats
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Filters
  const [plateText, setPlateText] = useState('')
  const [cameraId, setCameraId] = useState('')
  const [dateRange, setDateRange] = useState(null)

  // Table
  const [events, setEvents] = useState([])
  const [tableLoading, setTableLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })

  // Frame modal
  const [frameModal, setFrameModal] = useState({ open: false, event: null })

  // Video test upload
  const [uploadModal, setUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadJob, setUploadJob] = useState(null)   // {job_id, status, progress, detections}
  const [uploading, setUploading] = useState(false)
  const pollRef = useRef(null)

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await analyticsAPI.getEventStats()
      setStats(data)
    } catch {
      // silently fail — stats are supplementary
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchEvents = useCallback(async (page = 1, pageSize = 20) => {
    setTableLoading(true)
    try {
      const params = { page, limit: pageSize }
      if (plateText) params.plate_text = plateText.toUpperCase()
      if (cameraId) params.camera_id = cameraId
      if (dateRange && dateRange[0]) params.from_date = dateRange[0].toISOString()
      if (dateRange && dateRange[1]) params.to_date = dateRange[1].toISOString()
      const data = await analyticsAPI.searchEvents(params)
      setEvents(data.items ?? data)
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize,
        total: data.total ?? (data.items ?? data).length,
      }))
    } catch {
      message.error('Failed to load ANPR events')
    } finally {
      setTableLoading(false)
    }
  }, [plateText, cameraId, dateRange])

  useEffect(() => {
    fetchStats()
    fetchEvents()
  }, []) // eslint-disable-line

  const handleSearch = () => fetchEvents(1, pagination.pageSize)

  const handleReset = () => {
    setPlateText('')
    setCameraId('')
    setDateRange(null)
    // fetch with cleared params immediately
    setTimeout(() => fetchEvents(1, pagination.pageSize), 0)
  }

  const handleTableChange = (pag) => {
    fetchEvents(pag.current, pag.pageSize)
  }

  const startPoll = (jobId) => {
    pollRef.current = setInterval(async () => {
      try {
        const job = await analyticsAPI.getVideoTestResult(jobId)
        setUploadJob(job)
        if (job.status === 'done' || job.status === 'failed') {
          clearInterval(pollRef.current)
          setUploading(false)
        }
      } catch {
        clearInterval(pollRef.current)
        setUploading(false)
      }
    }, 2000)
  }

  const handleUploadTest = async () => {
    if (!uploadFile) { message.warning('Select a video file first'); return }
    setUploading(true)
    setUploadJob(null)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      const job = await analyticsAPI.uploadVideoTest(formData)
      setUploadJob(job)
      startPoll(job.job_id)
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Upload failed'
      message.error(detail)
      setUploading(false)
    }
  }

  const handleUploadModalClose = () => {
    clearInterval(pollRef.current)
    setUploadModal(false)
    setUploadFile(null)
    setUploadJob(null)
    setUploading(false)
  }

  const columns = [
    {
      title: 'Plate',
      dataIndex: 'plate_text',
      key: 'plate_text',
      render: (v) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 14 }}>
          {(v ?? '').toUpperCase()}
        </span>
      ),
    },
    {
      title: 'Camera',
      dataIndex: 'camera_id',
      key: 'camera_id',
    },
    {
      title: 'Location',
      dataIndex: 'location_name',
      key: 'location_name',
      render: (v) => v || '—',
    },
    {
      title: 'Detected At',
      dataIndex: 'detected_at',
      key: 'detected_at',
      render: (v) => v ? dayjs(v).format('DD MMM YYYY HH:mm:ss') : '—',
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (v) => confidenceLabel(v),
    },
    {
      title: 'Frame',
      key: 'frame',
      render: (_, record) => (
        <Button
          icon={<CameraOutlined />}
          size="small"
          onClick={() => setFrameModal({ open: true, event: record })}
          title="View Frame"
        />
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>ANPR Event Search</Title>
        <Button
          icon={<ExperimentOutlined />}
          onClick={() => setUploadModal(true)}
        >
          Test with Video
        </Button>
      </div>

      {/* Stats row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { title: 'Total Detections', value: stats?.total_detections },
          { title: 'Unique Plates', value: stats?.unique_plates },
          { title: "Today's Detections", value: stats?.today_detections },
          { title: 'Watchlist Matches', value: stats?.watchlist_matches, valueStyle: { color: '#cf1322' } },
        ].map((s) => (
          <Col xs={24} sm={12} md={6} key={s.title}>
            <Card>
              <Statistic
                title={s.title}
                value={statsLoading ? '—' : (s.value ?? 0)}
                valueStyle={s.valueStyle}
                loading={statsLoading}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filter bar */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size={12}>
          <Input
            placeholder="Plate text"
            prefix={<SearchOutlined />}
            value={plateText}
            onChange={(e) => setPlateText(e.target.value.toUpperCase())}
            style={{ width: 180 }}
            onPressEnter={handleSearch}
          />
          <Input
            placeholder="Camera ID / Label"
            value={cameraId}
            onChange={(e) => setCameraId(e.target.value)}
            style={{ width: 200 }}
            onPressEnter={handleSearch}
          />
          <RangePicker
            showTime
            value={dateRange}
            onChange={setDateRange}
            format="DD MMM YYYY HH:mm"
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            Search
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Reset
          </Button>
        </Space>
      </Card>

      {/* Results table */}
      <Card style={{ marginBottom: 24 }}>
        <Table
          rowKey={(r) => r.id ?? r.event_id ?? JSON.stringify(r)}
          columns={columns}
          dataSource={events}
          loading={tableLoading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `${total} events`,
          }}
          onChange={handleTableChange}
          locale={{ emptyText: <Empty description="No events found" /> }}
          size="middle"
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Top plates & cameras */}
      {stats && (
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Card title="Most Seen Plates">
              {stats.top_plates && stats.top_plates.length > 0 ? (
                <List
                  size="small"
                  dataSource={stats.top_plates}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Button
                          size="small"
                          icon={<CarOutlined />}
                          onClick={() => navigate(`/vehicle-route/${item.plate_text ?? item.plate}`)}
                        >
                          Track Route
                        </Button>,
                      ]}
                    >
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {(item.plate_text ?? item.plate ?? '').toUpperCase()}
                      </span>
                      <Tag style={{ marginLeft: 8 }}>{item.count} sightings</Tag>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="No data" />
              )}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Most Active Cameras">
              {stats.top_cameras && stats.top_cameras.length > 0 ? (
                <List
                  size="small"
                  dataSource={stats.top_cameras}
                  renderItem={(item) => (
                    <List.Item>
                      <EyeOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                      <span>{item.camera_id_label ?? item.camera_id ?? item.camera}</span>
                      <Tag style={{ marginLeft: 8 }}>{item.count} detections</Tag>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="No data" />
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* Video test upload modal */}
      <Modal
        open={uploadModal}
        title={<span><ExperimentOutlined /> Test ANPR with Video Upload</span>}
        onCancel={handleUploadModalClose}
        footer={null}
        width={780}
        destroyOnClose
      >
        {!uploadJob && (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Alert
              message="Upload a video (mp4, avi, mov) up to 5 minutes long. ANPR will run at 1 frame per second and show all detected plates."
              type="info"
              showIcon
            />
            <Upload
              beforeUpload={(file) => { setUploadFile(file); return false }}
              onRemove={() => setUploadFile(null)}
              accept=".mp4,.avi,.mov,.mkv,.webm"
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Select Video File</Button>
            </Upload>
            <Button
              type="primary"
              icon={<ExperimentOutlined />}
              onClick={handleUploadTest}
              loading={uploading}
              disabled={!uploadFile}
              block
            >
              Run ANPR
            </Button>
          </Space>
        )}

        {uploadJob && uploadJob.status !== 'done' && (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <div>
              <div style={{ marginBottom: 8, color: '#666' }}>
                Processing <strong>{uploadJob.filename}</strong> ({uploadJob.duration_s}s)
              </div>
              <Progress
                percent={uploadJob.total_frames > 0
                  ? Math.round((uploadJob.processed_frames / uploadJob.total_frames) * 100)
                  : 0}
                status={uploadJob.status === 'failed' ? 'exception' : 'active'}
              />
              <div style={{ marginTop: 8, color: '#888', fontSize: 13 }}>
                {uploadJob.processed_frames} / {uploadJob.total_frames} seconds processed
              </div>
            </div>
            <Spin tip="Running ANPR pipeline..." />
          </Space>
        )}

        {uploadJob && uploadJob.status === 'done' && (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Total Detections" value={uploadJob.total_detections} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Unique Plates" value={uploadJob.unique_plates} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Video Duration" value={`${uploadJob.duration_s}s`} />
                </Card>
              </Col>
            </Row>

            {uploadJob.detections.length === 0 ? (
              <Empty description="No license plates detected in this video" />
            ) : (
              <Table
                rowKey={(r) => `${r.plate_text}-${r.timestamp_s}`}
                size="small"
                pagination={{ pageSize: 10, showTotal: (t) => `${t} detections` }}
                dataSource={uploadJob.detections}
                columns={[
                  {
                    title: 'Plate',
                    dataIndex: 'plate_text',
                    render: (v) => (
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{v}</span>
                    ),
                  },
                  {
                    title: 'Time in Video',
                    dataIndex: 'timestamp_label',
                    render: (v) => <Tag>{v}</Tag>,
                  },
                  {
                    title: 'OCR Confidence',
                    dataIndex: 'confidence',
                    render: (v) => confidenceLabel(v),
                  },
                  {
                    title: 'Detect Conf',
                    dataIndex: 'detect_confidence',
                    render: (v) => confidenceLabel(v),
                  },
                ]}
              />
            )}

            <Button onClick={() => { setUploadJob(null); setUploadFile(null) }}>
              Test Another Video
            </Button>
          </Space>
        )}
      </Modal>

      {/* Frame modal */}
      <Modal
        open={frameModal.open}
        title={
          frameModal.event ? (
            <span>
              Frame — <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                {(frameModal.event.plate_text ?? '').toUpperCase()}
              </span>
            </span>
          ) : 'Frame'
        }
        onCancel={() => setFrameModal({ open: false, event: null })}
        footer={null}
        width={700}
      >
        {frameModal.event && (
          <>
            <img
              src={analyticsAPI.getFrameUrl(frameModal.event.id ?? frameModal.event.event_id)}
              alt="ANPR Frame"
              style={{ width: '100%', borderRadius: 8, marginBottom: 16 }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Plate">
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {(frameModal.event.plate_text ?? '').toUpperCase()}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Camera">
                {frameModal.event.camera_id ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {frameModal.event.location_name ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Detected At">
                {frameModal.event.detected_at
                  ? dayjs(frameModal.event.detected_at).format('DD MMM YYYY HH:mm:ss')
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Confidence">
                {confidenceLabel(frameModal.event.confidence)}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </div>
  )
}
