import React, { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, InputNumber, Space,
  Typography, message, Badge, Empty, Popconfirm, Tag,
} from 'antd'
import { PlusOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { analyticsAPI } from '../services/api.js'

dayjs.extend(relativeTime)

const { Title } = Typography

function statusBadge(status) {
  const map = {
    running: { status: 'success', text: 'Running' },
    stopped: { status: 'default', text: 'Stopped' },
    crashed: { status: 'error', text: 'Crashed' },
  }
  const s = map[status] ?? { status: 'processing', text: status ?? 'Unknown' }
  return <Badge status={s.status} text={s.text} />
}

function maskRtsp(url) {
  if (!url) return '—'
  // Hide credentials in rtsp://user:pass@host/...
  return url.replace(/(rtsp:\/\/)([^@]+@)/, '$1***@')
}

export default function IngestionWorkers() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchWorkers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await analyticsAPI.getWorkers()
      setWorkers(Array.isArray(data) ? data : (data.items ?? []))
    } catch {
      message.error('Failed to load workers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkers()
    const timer = setInterval(fetchWorkers, 10000)
    return () => clearInterval(timer)
  }, [fetchWorkers])

  const handleStart = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      await analyticsAPI.startWorker(values)
      message.success('Worker started')
      setModalOpen(false)
      form.resetFields()
      fetchWorkers()
    } catch (err) {
      if (err?.errorFields) return
      message.error('Failed to start worker')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStop = async (record) => {
    try {
      await analyticsAPI.stopWorker(record.id)
      message.success('Worker stopped')
      fetchWorkers()
    } catch {
      message.error('Failed to stop worker')
    }
  }

  const columns = [
    {
      title: 'Camera',
      dataIndex: 'camera_id_label',
      key: 'camera_id_label',
      render: (v, r) => v ?? r.camera_id ?? '—',
    },
    {
      title: 'RTSP URL',
      dataIndex: 'rtsp_url',
      key: 'rtsp_url',
      render: (v) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{maskRtsp(v)}</span>
      ),
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => statusBadge(v),
    },
    {
      title: 'Frames',
      dataIndex: 'frames_processed',
      key: 'frames_processed',
      render: (v) => (v ?? 0).toLocaleString(),
    },
    {
      title: 'Detections',
      dataIndex: 'detections',
      key: 'detections',
      render: (v) => (v ?? 0).toLocaleString(),
    },
    {
      title: 'Last Heartbeat',
      dataIndex: 'last_heartbeat',
      key: 'last_heartbeat',
      render: (v) => v ? dayjs(v).fromNow() : '—',
    },
    {
      title: 'Started At',
      dataIndex: 'started_at',
      key: 'started_at',
      render: (v) => v ? dayjs(v).format('DD MMM YYYY HH:mm:ss') : '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm
          title="Stop this worker?"
          onConfirm={() => handleStop(record)}
          okText="Stop"
          okButtonProps={{ danger: true }}
          cancelText="Cancel"
          disabled={record.status === 'stopped'}
        >
          <Button
            size="small"
            danger
            icon={<StopOutlined />}
            disabled={record.status === 'stopped'}
          >
            Stop
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Ingestion Workers</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchWorkers} loading={loading}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Start Worker
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={workers}
        loading={loading}
        locale={{ emptyText: <Empty description="No workers running" /> }}
        size="middle"
        pagination={{ pageSize: 20, showTotal: (t) => `${t} workers` }}
        scroll={{ x: 900 }}
      />

      {/* Start Worker modal */}
      <Modal
        open={modalOpen}
        title="Start Ingestion Worker"
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        onOk={handleStart}
        okText="Start"
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="camera_id_label" label="Camera Label">
            <Input placeholder="e.g. Gate 1 - Main Entrance" />
          </Form.Item>
          <Form.Item
            name="rtsp_url"
            label="RTSP URL"
            rules={[{ required: true, message: 'RTSP URL is required' }]}
          >
            <Input placeholder="rtsp://user:pass@192.168.1.100:554/stream" />
          </Form.Item>
          <Form.Item name="location_name" label="Location Name">
            <Input placeholder="e.g. Main Gate" />
          </Form.Item>
          <Form.Item label="Coordinates" style={{ marginBottom: 0 }}>
            <Space>
              <Form.Item name="latitude" style={{ marginBottom: 0 }}>
                <InputNumber placeholder="Latitude" style={{ width: 160 }} step={0.0001} />
              </Form.Item>
              <Form.Item name="longitude" style={{ marginBottom: 0 }}>
                <InputNumber placeholder="Longitude" style={{ width: 160 }} step={0.0001} />
              </Form.Item>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
