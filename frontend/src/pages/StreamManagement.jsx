import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Badge,
  Statistic,
  Row,
  Col,
  Modal,
  Radio,
  Popconfirm,
  message,
  Alert,
  Typography,
  Tooltip,
} from 'antd'
import {
  PlayCircleOutlined,
  MedicineBoxOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { streamingAPI } from '../services/api.js'
import AddStreamModal from '../components/Stream/AddStreamModal.jsx'
import LiveStreamPlayer from '../components/Stream/LiveStreamPlayer.jsx'

dayjs.extend(relativeTime)

const { Title, Text } = Typography

const HEALTH_CONFIG = {
  online: { color: 'green', text: 'Online', icon: <CheckCircleOutlined /> },
  offline: { color: 'red', text: 'Offline', icon: <CloseCircleOutlined /> },
  unknown: { color: 'default', text: 'Unknown', icon: <QuestionCircleOutlined /> },
}

export default function StreamManagement() {
  const [streams, setStreams] = useState([])
  const [summary, setSummary] = useState({ total: 0, online: 0, offline: 0, unknown: 0 })
  const [loading, setLoading] = useState(false)
  const [healthChecking, setHealthChecking] = useState({})

  // Add / Edit modal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editStream, setEditStream] = useState(null)

  // Live stream modal
  const [liveModal, setLiveModal] = useState({ open: false, stream: null })
  const [quality, setQuality] = useState('sub')
  const [sessionInfo, setSessionInfo] = useState(null) // { id, playlist_url }
  const [sessionLoading, setSessionLoading] = useState(false)
  const [sessionError, setSessionError] = useState(null)

  const refreshTimer = useRef(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [streamList, healthSummary] = await Promise.all([
        streamingAPI.listStreams(),
        streamingAPI.getHealthSummary(),
      ])
      setStreams(Array.isArray(streamList) ? streamList : streamList?.items ?? [])
      setSummary({
        total: healthSummary.total ?? 0,
        online: healthSummary.online ?? 0,
        offline: healthSummary.offline ?? 0,
        unknown: healthSummary.unknown ?? 0,
      })
    } catch (err) {
      message.error('Failed to load streams')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    refreshTimer.current = setInterval(fetchData, 30000)
    return () => clearInterval(refreshTimer.current)
  }, [fetchData])

  const handleHealthCheck = async (streamId) => {
    setHealthChecking((prev) => ({ ...prev, [streamId]: true }))
    try {
      await streamingAPI.checkHealth(streamId)
      message.success('Health check triggered')
      // Short delay then refresh to pick up updated status
      setTimeout(fetchData, 2000)
    } catch {
      message.error('Health check failed')
    } finally {
      setHealthChecking((prev) => ({ ...prev, [streamId]: false }))
    }
  }

  const handleDelete = async (streamId) => {
    try {
      await streamingAPI.deleteStream(streamId)
      message.success('Stream deleted')
      fetchData()
    } catch {
      message.error('Failed to delete stream')
    }
  }

  // ── Live stream session management ─────────────────────────────────────────

  const startSession = useCallback(async (streamId, q) => {
    setSessionLoading(true)
    setSessionError(null)
    setSessionInfo(null)
    try {
      const data = await streamingAPI.startSession(streamId, q)
      setSessionInfo({ id: data.id, playlist_url: data.playlist_url })
    } catch (err) {
      const detail = err?.response?.data?.detail
      setSessionError(detail || 'Failed to start stream session')
    } finally {
      setSessionLoading(false)
    }
  }, [])

  const stopSession = useCallback(async (sessionId) => {
    if (!sessionId) return
    try {
      await streamingAPI.stopSession(sessionId)
    } catch {
      // silently ignore stop errors
    }
  }, [])

  const handleOpenLive = (stream) => {
    setLiveModal({ open: true, stream })
    setQuality('sub')
    setSessionInfo(null)
    setSessionError(null)
    startSession(stream.id, 'sub')
  }

  const handleLiveModalClose = async () => {
    const sid = sessionInfo?.id
    setLiveModal({ open: false, stream: null })
    setSessionInfo(null)
    setSessionError(null)
    setQuality('sub')
    await stopSession(sid)
  }

  const handleQualityChange = async (e) => {
    const newQuality = e.target.value
    const prevSessionId = sessionInfo?.id
    setQuality(newQuality)
    setSessionInfo(null)
    await stopSession(prevSessionId)
    if (liveModal.stream) {
      await startSession(liveModal.stream.id, newQuality)
    }
  }

  // ── Table columns ──────────────────────────────────────────────────────────

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Camera ID',
      dataIndex: 'camera_id_label',
      key: 'camera_id_label',
      render: (val) => val || <Text type="secondary">—</Text>,
    },
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department_name',
      render: (val) => val || <Text type="secondary">—</Text>,
    },
    {
      title: 'RTSP URL',
      dataIndex: 'rtsp_url_masked',
      key: 'rtsp_url_masked',
      render: (val) => (
        <Text code style={{ fontSize: 12 }}>
          {val || '—'}
        </Text>
      ),
    },
    {
      title: 'Health',
      dataIndex: 'health_status',
      key: 'health_status',
      render: (status) => {
        const cfg = HEALTH_CONFIG[status] || HEALTH_CONFIG.unknown
        return (
          <Badge
            status={status === 'online' ? 'success' : status === 'offline' ? 'error' : 'default'}
            text={<Text style={{ textTransform: 'capitalize' }}>{cfg.text}</Text>}
          />
        )
      },
    },
    {
      title: 'Last Checked',
      dataIndex: 'last_health_check_at',
      key: 'last_health_check_at',
      render: (val) =>
        val ? (
          <Tooltip title={dayjs(val).format('YYYY-MM-DD HH:mm:ss')}>
            <Text>{dayjs(val).fromNow()}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">Never</Text>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="View Live">
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => handleOpenLive(record)}
            >
              Live
            </Button>
          </Tooltip>

          <Tooltip title="Check Health">
            <Button
              size="small"
              icon={<MedicineBoxOutlined />}
              loading={healthChecking[record.id]}
              onClick={() => handleHealthCheck(record.id)}
            />
          </Tooltip>

          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditStream(record)
                setAddModalOpen(true)
              }}
            />
          </Tooltip>

          <Popconfirm
            title="Delete stream?"
            description="This will permanently remove this stream registration."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Tooltip title="Delete">
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  const liveStream = liveModal.stream
  const healthCfg = liveStream ? HEALTH_CONFIG[liveStream.health_status] || HEALTH_CONFIG.unknown : null

  return (
    <div style={{ padding: 0 }}>
      {/* Page heading */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Live Streams
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditStream(null)
              setAddModalOpen(true)
            }}
          >
            Register Stream
          </Button>
        </Space>
      </div>

      {/* Health summary cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Total Streams"
              value={summary.total}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Online"
              value={summary.online}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Offline"
              value={summary.offline}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Unknown"
              value={summary.unknown}
              valueStyle={{ color: '#8c8c8c' }}
              prefix={<QuestionCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Streams table */}
      <Card>
        <Table
          rowKey="id"
          dataSource={streams}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          size="small"
          scroll={{ x: 900 }}
        />
      </Card>

      {/* Add / Edit stream modal */}
      <AddStreamModal
        open={addModalOpen}
        onClose={() => {
          setAddModalOpen(false)
          setEditStream(null)
        }}
        onSuccess={fetchData}
        initialValues={
          editStream
            ? {
                name: editStream.name,
                rtsp_url: '', // never pre-fill credentials
                camera_id_label: editStream.camera_id_label || '',
                department_name: editStream.department_name || '',
              }
            : null
        }
        editId={editStream?.id}
      />

      {/* Live stream modal */}
      <Modal
        title={
          liveStream ? (
            <Space>
              <span>{liveStream.name}</span>
              {healthCfg && (
                <Badge
                  status={
                    liveStream.health_status === 'online'
                      ? 'success'
                      : liveStream.health_status === 'offline'
                      ? 'error'
                      : 'default'
                  }
                  text={healthCfg.text}
                />
              )}
            </Space>
          ) : (
            'Live Stream'
          )
        }
        open={liveModal.open}
        onCancel={handleLiveModalClose}
        footer={null}
        width={900}
        destroyOnClose
        styles={{ body: { padding: '16px 24px 24px' } }}
      >
        {liveStream?.health_status === 'offline' && (
          <Alert
            type="warning"
            message="This camera appears to be offline. Attempting to connect anyway..."
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {/* Quality selector */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Text strong>Quality:</Text>
          <Radio.Group
            value={quality}
            onChange={handleQualityChange}
            disabled={sessionLoading}
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="sub">Sub Stream (Low)</Radio.Button>
            <Radio.Button value="main">Main Stream (High)</Radio.Button>
          </Radio.Group>
        </div>

        {/* Player area */}
        {sessionLoading && !sessionInfo && (
          <div
            style={{
              height: 360,
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.6)' }}>Starting session...</Text>
          </div>
        )}

        {sessionError && (
          <Alert
            type="error"
            message="Session Error"
            description={sessionError}
            showIcon
          />
        )}

        {sessionInfo?.playlist_url && (
          <LiveStreamPlayer
            playlistUrl={sessionInfo.playlist_url}
            sessionId={sessionInfo.id}
            onStop={handleLiveModalClose}
          />
        )}
      </Modal>
    </div>
  )
}
