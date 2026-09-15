import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Spin,
  Empty,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  message,
  Badge,
  Row,
  Col,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { usersAPI, departmentsAPI } from '../services/api.js'

const { Title, Text } = Typography
const { Option } = Select

const ROLE_CONFIG = {
  super_admin: { color: 'red', label: 'Super Admin' },
  dept_admin: { color: 'orange', label: 'Dept Admin' },
  operator: { color: 'blue', label: 'Operator' },
  viewer: { color: 'default', label: 'Viewer' },
}

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const selectedRole = Form.useWatch('role', form)

  const fetchUsers = useCallback(async (pg = 1) => {
    setLoading(true)
    try {
      const data = await usersAPI.list({ page: pg, limit: pageSize })
      if (Array.isArray(data)) {
        setUsers(data)
        setTotal(data.length)
      } else {
        setUsers(data.items || data)
        setTotal(data.total || (data.items || data).length)
      }
    } catch {
      setUsers([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  useEffect(() => {
    fetchUsers(1)
    departmentsAPI.list().then((d) => {
      setDepartments(Array.isArray(d) ? d : d.items || [])
    }).catch(() => setDepartments([]))
  }, [fetchUsers])

  const openAddModal = () => {
    setEditingUser(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true, role: 'operator' })
    setModalOpen(true)
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    form.setFieldsValue({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department_id: user.department_id || user.department?.id,
      is_active: user.is_active ?? true,
      password: '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const payload = { ...values }
      // For edit, omit password if empty
      if (editingUser && !payload.password) {
        delete payload.password
      }
      if (payload.role === 'super_admin') {
        delete payload.department_id
      }
      if (editingUser) {
        await usersAPI.update(editingUser.id, payload)
        message.success('User updated successfully')
      } else {
        await usersAPI.create(payload)
        message.success('User created successfully')
      }
      setModalOpen(false)
      fetchUsers(page)
    } catch (err) {
      if (err?.errorFields) return
      message.error(err?.response?.data?.detail || 'Failed to save user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await usersAPI.remove(id)
      message.success('User deleted')
      fetchUsers(page)
    } catch {
      message.error('Failed to delete user')
    }
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (v, r) => v || r.name || '—',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (v) => {
        const cfg = ROLE_CONFIG[v] || { color: 'default', label: v || 'Unknown' }
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      },
    },
    {
      title: 'Department',
      key: 'department',
      render: (_, r) => r.department?.name || r.dept_name || <Text type="secondary">—</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v) =>
        v ? <Badge status="success" text="Active" /> : <Badge status="default" text="Inactive" />,
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v) => (v ? dayjs(v).format('DD MMM YYYY HH:mm') : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this user?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>
          User Management
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Add User
        </Button>
      </div>

      <Card>
        {loading && !users.length ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            dataSource={users}
            rowKey={(r) => r.id || r.email || Math.random()}
            columns={columns}
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (pg) => {
                setPage(pg)
                fetchUsers(pg)
              },
            }}
            size="small"
            locale={{ emptyText: <Empty description="No users found" /> }}
          />
        )}
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        title={editingUser ? 'Edit User' : 'Add User'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText={editingUser ? 'Save Changes' : 'Create User'}
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="full_name"
                label="Full Name"
                rules={[{ required: true, message: 'Full name is required' }]}
              >
                <Input placeholder="Enter full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Email is required' },
                  { type: 'email', message: 'Enter a valid email' },
                ]}
              >
                <Input placeholder="user@example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="password"
            label={editingUser ? 'Password (leave blank to keep current)' : 'Password'}
            rules={editingUser ? [] : [{ required: true, message: 'Password is required' }]}
          >
            <Input.Password placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="Role"
                rules={[{ required: true, message: 'Role is required' }]}
              >
                <Select placeholder="Select role">
                  {Object.entries(ROLE_CONFIG).map(([k, v]) => (
                    <Option key={k} value={k}>
                      <Tag color={v.color}>{v.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="department_id"
                label="Department"
              >
                <Select
                  placeholder="Select department"
                  disabled={selectedRole === 'super_admin'}
                  allowClear
                >
                  {departments.map((d) => (
                    <Option key={d.id} value={d.id}>
                      {d.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
