import React, { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Switch, Tag, Space,
  Typography, message, Popconfirm, Empty, Badge,
} from 'antd'
import {
  PlusOutlined, EditOutlined, CheckOutlined, StopOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { analyticsAPI } from '../services/api.js'

const { Title, Text } = Typography
const { TextArea } = Input

// Rough Indian plate validation: 2 letters + 2 digits + 1-3 letters + 1-4 digits
const PLATE_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{1,4}$/

function normalizePlate(v) {
  return (v ?? '').toUpperCase().replace(/[\s-]/g, '')
}

export default function Watchlist() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (!showInactive) params.active = true
      const data = await analyticsAPI.getWatchlist(params)
      setItems(Array.isArray(data) ? data : (data.items ?? []))
    } catch {
      message.error('Failed to load watchlist')
    } finally {
      setLoading(false)
    }
  }, [showInactive])

  useEffect(() => { fetchList() }, [fetchList])

  const openAdd = () => {
    setEditRecord(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditRecord(record)
    form.setFieldsValue({ plate_text: record.plate_text, reason: record.reason })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const normalized = normalizePlate(values.plate_text)
      setSubmitting(true)
      if (editRecord) {
        await analyticsAPI.updateWatchlist(editRecord.id, { reason: values.reason })
        message.success('Watchlist entry updated')
      } else {
        await analyticsAPI.addToWatchlist({ plate_text: normalized, reason: values.reason })
        message.success(`${normalized} added to watchlist`)
      }
      setModalOpen(false)
      fetchList()
    } catch (err) {
      if (err?.errorFields) return // antd validation error, do nothing
      message.error('Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (record) => {
    try {
      await analyticsAPI.updateWatchlist(record.id, { active: !record.active })
      message.success(`Entry ${record.active ? 'deactivated' : 'activated'}`)
      fetchList()
    } catch {
      message.error('Failed to update status')
    }
  }

  const handleDelete = async (record) => {
    try {
      await analyticsAPI.removeFromWatchlist(record.id)
      message.success('Entry removed')
      fetchList()
    } catch {
      message.error('Failed to remove entry')
    }
  }

  const columns = [
    {
      title: 'Plate',
      dataIndex: 'plate_text',
      key: 'plate_text',
      render: (v, record) => (
        <Tag
          color={record.active ? 'red' : 'default'}
          style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 14 }}
        >
          {(v ?? '').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Tagged By',
      dataIndex: 'tagged_by',
      key: 'tagged_by',
      render: (v) => v ?? '—',
    },
    {
      title: 'Tagged At',
      dataIndex: 'tagged_at',
      key: 'tagged_at',
      render: (v) => v ? dayjs(v).format('DD MMM YYYY HH:mm:ss') : '—',
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      render: (v) =>
        v ? (
          <Badge status="error" text="Active" />
        ) : (
          <Badge status="default" text="Inactive" />
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title={record.active ? 'Deactivate this entry?' : 'Activate this entry?'}
            onConfirm={() => toggleActive(record)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              size="small"
              icon={record.active ? <StopOutlined /> : <CheckOutlined />}
              danger={record.active}
            >
              {record.active ? 'Deactivate' : 'Activate'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Vehicle Watchlist</Title>
        <Space>
          <Space>
            <Text>Show inactive</Text>
            <Switch checked={showInactive} onChange={setShowInactive} size="small" />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            Add to Watchlist
          </Button>
        </Space>
      </div>

      {/* Table */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        locale={{ emptyText: <Empty description="No watchlist entries" /> }}
        size="middle"
        pagination={{ pageSize: 20, showTotal: (t) => `${t} entries` }}
      />

      {/* Add/Edit modal */}
      <Modal
        open={modalOpen}
        title={editRecord ? `Edit: ${editRecord.plate_text}` : 'Add to Watchlist'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editRecord ? 'Update' : 'Add'}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {!editRecord && (
            <Form.Item
              name="plate_text"
              label="Plate Number"
              rules={[
                { required: true, message: 'Plate number is required' },
                {
                  validator: (_, value) => {
                    const normalized = normalizePlate(value)
                    if (!normalized) return Promise.reject('Plate number is required')
                    if (!PLATE_REGEX.test(normalized)) {
                      return Promise.reject(
                        'Invalid Indian plate format (e.g., GJ05AB1234)'
                      )
                    }
                    return Promise.resolve()
                  },
                },
              ]}
              extra="Plate will be automatically normalized (spaces and dashes removed)"
            >
              <Input
                placeholder="GJ05AB1234"
                style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                onChange={(e) =>
                  form.setFieldValue('plate_text', e.target.value.toUpperCase())
                }
              />
            </Form.Item>
          )}
          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Reason is required' }]}
          >
            <TextArea rows={3} placeholder="Reason for adding to watchlist..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
