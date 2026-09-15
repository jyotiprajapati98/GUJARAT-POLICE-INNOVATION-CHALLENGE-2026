import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd'
import { LockOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext.jsx'

const { Title, Text } = Typography

export default function Login() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [form] = Form.useForm()

  const onFinish = async (values) => {
    setLoading(true)
    setError(null)
    try {
      await login(values.email, values.password)
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Invalid credentials. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001529 0%, #003366 50%, #001529 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Header branding */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 72,
              height: 72,
              background: 'linear-gradient(135deg, #1677ff, #0958d9)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 4px 20px rgba(22,119,255,0.4)',
            }}
          >
            <SafetyOutlined style={{ fontSize: 36, color: '#fff' }} />
          </div>
          <Title level={2} style={{ color: '#fff', margin: 0, letterSpacing: 1 }}>
            Raksha
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>
            CCTV Registry Portal
          </Text>
        </div>

        <Card
          style={{
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            border: 'none',
          }}
          styles={{ body: { padding: '32px 36px' } }}
        >
          <Title level={4} style={{ textAlign: 'center', marginBottom: 24, color: '#001529' }}>
            Sign in to your account
          </Title>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              style={{ marginBottom: 20 }}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="admin@raksha.gov.in"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 44,
                  fontSize: 15,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #1677ff, #0958d9)',
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Form.Item>
          </Form>

          <div
            style={{
              background: '#f6f8fa',
              borderRadius: 8,
              padding: '12px 16px',
              border: '1px solid #e8ecf0',
            }}
          >
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Default credentials for testing:
            </Text>
            <Space direction="vertical" size={2}>
              <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
                <strong>Email:</strong> admin@raksha.gov.in
              </Text>
              <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
                <strong>Password:</strong> Admin@123
              </Text>
            </Space>
          </div>
        </Card>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
            Government of India &bull; Ministry of Home Affairs &bull; Secure Portal
          </Text>
        </div>
      </div>
    </div>
  )
}
