import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CameraRegistry from './pages/CameraRegistry.jsx'
import CameraMap from './pages/CameraMap.jsx'
import HealthDashboard from './pages/HealthDashboard.jsx'
import GapAnalysis from './pages/GapAnalysis.jsx'
import AuditTrail from './pages/AuditTrail.jsx'
import UserManagement from './pages/UserManagement.jsx'
import IntegrationReadiness from './pages/IntegrationReadiness.jsx'
import AppLayout from './components/Layout/AppLayout.jsx'
import StreamManagement from './pages/StreamManagement.jsx'
import ANPRSearch from './pages/ANPRSearch.jsx'
import Watchlist from './pages/Watchlist.jsx'
import AlertsDashboard from './pages/AlertsDashboard.jsx'
import VehicleRoute from './pages/VehicleRoute.jsx'
import IngestionWorkers from './pages/IngestionWorkers.jsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <AppLayout>{children}</AppLayout>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cameras"
        element={
          <ProtectedRoute>
            <CameraRegistry />
          </ProtectedRoute>
        }
      />
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <CameraMap />
          </ProtectedRoute>
        }
      />
      <Route
        path="/integration"
        element={
          <ProtectedRoute>
            <IntegrationReadiness />
          </ProtectedRoute>
        }
      />
      <Route
        path="/health"
        element={
          <ProtectedRoute>
            <HealthDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gap-analysis"
        element={
          <ProtectedRoute>
            <GapAnalysis />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <AuditTrail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/streams"
        element={
          <ProtectedRoute>
            <StreamManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/anpr"
        element={
          <ProtectedRoute>
            <ANPRSearch />
          </ProtectedRoute>
        }
      />
      <Route
        path="/watchlist"
        element={
          <ProtectedRoute>
            <Watchlist />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <AlertsDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vehicle-route"
        element={
          <ProtectedRoute>
            <VehicleRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vehicle-route/:plate"
        element={
          <ProtectedRoute>
            <VehicleRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workers"
        element={
          <ProtectedRoute>
            <IngestionWorkers />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
