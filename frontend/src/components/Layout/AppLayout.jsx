import React, { useState, useEffect } from 'react'
import { Layout, Menu, Button, Typography, Space, Tag, Breadcrumb, Avatar, Badge } from 'antd'
import {
  DashboardOutlined,
  VideoCameraOutlined,
  EnvironmentOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  SafetyOutlined,
  ApiOutlined,
  HeartOutlined,
  BarChartOutlined,
  TeamOutlined,
  AuditOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  CarOutlined,
  BellOutlined,
  EyeOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { analyticsAPI } from '../../services/api.js'

const { Sider, Header, Content } = Layout
const { Text } = Typography

const ROLE_COLOR = {
  super_admin: 'red',
  dept_admin: 'orange',
  operator: 'blue',
  viewer: 'default',
}

const ROLE_LABEL = {
  super_admin: 'Super Admin',
  dept_admin: 'Dept Admin',
  operator: 'Operator',
  viewer: 'Viewer',
}

const BREADCRUMB_MAP = {
  '/dashboard': 'Dashboard',
  '/cameras': 'Camera Registry',
  '/map': 'GIS Map',
  '/integration': 'Integration Readiness',
  '/health': 'Health Dashboard',
  '/gap-analysis': 'Gap Analysis',
  '/users': 'User Management',
  '/audit': 'Audit Trail',
  '/streams': 'Live Streams',
  '/anpr': 'ANPR Search',
  '/vehicle-route': 'Vehicle Route',
  '/alerts': 'Alerts Dashboard',
  '/watchlist': 'Vehicle Watchlist',
  '/workers': 'Ingestion Workers',
}

function buildMenuItems(hasRole, unacknowledgedCount) {
  const adminOnly = hasRole(['super_admin', 'dept_admin'])

  return [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      type: 'group',
      label: 'Registry',
      children: [
        {
          key: '/cameras',
          icon: <VideoCameraOutlined />,
          label: 'Camera Registry',
        },
        {
          key: '/map',
          icon: <EnvironmentOutlined />,
          label: 'GIS Map',
        },
        {
          key: '/streams',
          icon: <PlayCircleOutlined />,
          label: 'Live Streams',
        },
        {
          key: '/integration',
          icon: <ApiOutlined />,
          label: 'Integration',
        },
      ],
    },
    {
      type: 'group',
      label: 'Monitoring',
      children: [
        {
          key: '/health',
          icon: <HeartOutlined />,
          label: 'Health Dashboard',
        },
        {
          key: '/gap-analysis',
          icon: <BarChartOutlined />,
          label: 'Gap Analysis',
        },
      ],
    },
    {
      type: 'group',
      label: 'Intelligence',
      children: [
        {
          key: '/anpr',
          icon: <SearchOutlined />,
          label: 'ANPR Search',
        },
        {
          key: '/vehicle-route',
          icon: <CarOutlined />,
          label: 'Vehicle Route',
        },
        {
          key: '/alerts',
          icon: <BellOutlined />,
          label: (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Alerts
              {unacknowledgedCount > 0 && (
                <Badge
                  count={unacknowledgedCount}
                  overflowCount={99}
                  size="small"
                  style={{ marginLeft: 6 }}
                />
              )}
            </span>
          ),
        },
        {
          key: '/watchlist',
          icon: <EyeOutlined />,
          label: 'Watchlist',
        },
      ],
    },
    ...(adminOnly
      ? [
          {
            type: 'group',
            label: 'Administration',
            children: [
              {
                key: '/users',
                icon: <TeamOutlined />,
                label: 'User Management',
              },
              {
                key: '/audit',
                icon: <AuditOutlined />,
                label: 'Audit Trail',
              },
              {
                key: '/workers',
                icon: <SettingOutlined />,
                label: 'Ingestion Workers',
              },
            ],
          },
        ]
      : []),
  ]
}

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, hasRole } = useAuth()

  const currentPath = location.pathname
  // For breadcrumb: strip dynamic :plate segment
  const basePath = '/' + currentPath.split('/')[1]
  const pageTitle = BREADCRUMB_MAP[basePath] || BREADCRUMB_MAP[currentPath] || 'Page'
  const menuItems = buildMenuItems(hasRole, unacknowledgedCount)

  // Fetch unacknowledged alert count for sidebar badge
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await analyticsAPI.getAlerts({ acknowledged: false, limit: 1 })
        const count = typeof data.total === 'number' ? data.total : 0
        setUnacknowledgedCount(count)
      } catch {
        // silently ignore — badge is supplementary
      }
    }
    fetchCount()
    const timer = setInterval(fetchCount, 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
        collapsedWidth={64}
        trigger={null}
        style={{
          background: '#001529',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'auto',
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: collapsed ? '20px 16px' : '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            overflow: 'hidden',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/dashboard')}
        >
          <div
            style={{
              width: 32,
              height: 32,
              minWidth: 32,
              background: 'linear-gradient(135deg, #1677ff, #0958d9)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SafetyOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                Raksha
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, lineHeight: 1.2 }}>
                CCTV Registry
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPath]}
          style={{ borderRight: 0, marginTop: 8 }}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />

        {/* Collapse Toggle */}
        <div
          style={{
            position: 'absolute',
            bottom: 56,
            width: '100%',
            padding: '8px 16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              color: 'rgba(255,255,255,0.65)',
              width: '100%',
              textAlign: collapsed ? 'center' : 'left',
            }}
          >
            {!collapsed && 'Collapse'}
          </Button>
        </div>
      </Sider>

      {/* Main Layout */}
      <Layout
        style={{
          marginLeft: collapsed ? 64 : 220,
          transition: 'margin-left 0.2s',
        }}
      >
        {/* Header */}
        <Header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 99,
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            height: 56,
          }}
        >
          {/* Left: Breadcrumb */}
          <Breadcrumb
            items={[
              { title: <Link to="/dashboard">Home</Link> },
              { title: pageTitle },
            ]}
          />

          {/* Right: User info */}
          <Space size={12} align="center">
            <Tag
              color={ROLE_COLOR[user?.role] || 'default'}
              style={{ marginRight: 0, fontWeight: 600 }}
            >
              {ROLE_LABEL[user?.role] || user?.role || 'User'}
            </Tag>
            <Space size={6}>
              <Avatar
                size={30}
                icon={<UserOutlined />}
                style={{ background: '#1677ff' }}
              />
              <div style={{ lineHeight: 1.3 }}>
                <Text strong style={{ fontSize: 13, display: 'block' }}>
                  {user?.full_name || user?.email?.split('@')[0] || 'User'}
                </Text>
                {user?.department?.name && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {user.department.name}
                  </Text>
                )}
              </div>
            </Space>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={logout}
              size="small"
              danger
              title="Logout"
            >
              Logout
            </Button>
          </Space>
        </Header>

        {/* Content */}
        <Content
          style={{
            padding: 24,
            background: '#f5f6fa',
            minHeight: 'calc(100vh - 56px)',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
