import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)
    const res = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return res.data
  },
  getMe: async () => {
    const res = await api.get('/auth/me')
    return res.data
  },
}

// Cameras API
export const camerasAPI = {
  list: async (params = {}) => {
    const res = await api.get('/cameras/', { params })
    return res.data
  },
  get: async (id) => {
    const res = await api.get(`/cameras/${id}`)
    return res.data
  },
  create: async (data) => {
    const res = await api.post('/cameras/', data)
    return res.data
  },
  update: async (id, data) => {
    const res = await api.put(`/cameras/${id}`, data)
    return res.data
  },
  remove: async (id) => {
    const res = await api.delete(`/cameras/${id}`)
    return res.data
  },
  bulkImport: async (file, departmentId) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('department_id', departmentId)
    const res = await api.post('/cameras/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },
  exportCSV: async () => {
    const res = await api.get('/cameras/export/csv', { responseType: 'blob' })
    return res.data
  },
  getStats: async () => {
    const res = await api.get('/cameras/stats')
    return res.data
  },
}

// Departments API
export const departmentsAPI = {
  list: async (params = {}) => {
    const res = await api.get('/departments/', { params })
    return res.data
  },
  get: async (id) => {
    const res = await api.get(`/departments/${id}`)
    return res.data
  },
  create: async (data) => {
    const res = await api.post('/departments/', data)
    return res.data
  },
  update: async (id, data) => {
    const res = await api.put(`/departments/${id}`, data)
    return res.data
  },
}

// GIS API
export const gisAPI = {
  getCamerasGeoJSON: async (params = {}) => {
    const res = await api.get('/gis/cameras', { params })
    return res.data
  },
  getDepartmentsSummary: async () => {
    const res = await api.get('/gis/departments-summary')
    return res.data
  },
  getHeatmapData: async (params = {}) => {
    const res = await api.get('/gis/heatmap', { params })
    return res.data
  },
}

// Integration API
export const integrationAPI = {
  getSummary: async (params = {}) => {
    const res = await api.get('/integration/summary', { params })
    return res.data
  },
  getByCamera: async (cameraId) => {
    const res = await api.get(`/integration/cameras/${cameraId}`)
    return res.data
  },
  upsert: async (cameraId, data) => api.post(`/integration/cameras/${cameraId}`, data),
  getStats: async () => {
    const res = await api.get('/integration/stats')
    return res.data
  },
}

// Health Monitor API
export const healthAPI = {
  getSummary: async () => {
    const res = await api.get('/health-monitor/summary')
    return res.data
  },
  getCameras: async (params = {}) => {
    const res = await api.get('/health-monitor/cameras', { params })
    return res.data
  },
}

// Gap Analysis API
export const gapAnalysisAPI = {
  getReport: async () => {
    const res = await api.get('/gap-analysis/report')
    return res.data
  },
}

// Audit API
export const auditAPI = {
  getLogs: async (params = {}) => {
    const res = await api.get('/audit/logs', { params })
    return res.data
  },
}

// Users API
export const usersAPI = {
  list: async (params = {}) => {
    const res = await api.get('/users/', { params })
    return res.data
  },
  create: async (data) => {
    const res = await api.post('/users/', data)
    return res.data
  },
  update: async (id, data) => {
    const res = await api.put(`/users/${id}`, data)
    return res.data
  },
  remove: async (id) => {
    const res = await api.delete(`/users/${id}`)
    return res.data
  },
}

export default api

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Service API (analytics-svc at /api/analytics/v1)
// ─────────────────────────────────────────────────────────────────────────────
const analyticsApi = axios.create({ baseURL: '/api/analytics/v1' })
analyticsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
analyticsApi.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const analyticsAPI = {
  // ANPR
  searchEvents: async (params = {}) => { const r = await analyticsApi.get('/anpr/events', { params }); return r.data },
  getEventStats: async () => { const r = await analyticsApi.get('/anpr/events/stats'); return r.data },
  submitEvent: async (data) => { const r = await analyticsApi.post('/anpr/events', data); return r.data },
  getFrameUrl: (eventId) => `/api/analytics/v1/anpr/frame/${eventId}?token=${localStorage.getItem('token') || ''}`,

  // Watchlist
  getWatchlist: async (params = {}) => { const r = await analyticsApi.get('/watchlist', { params }); return r.data },
  addToWatchlist: async (data) => { const r = await analyticsApi.post('/watchlist', data); return r.data },
  updateWatchlist: async (id, data) => { const r = await analyticsApi.patch(`/watchlist/${id}`, data); return r.data },
  removeFromWatchlist: async (id) => { const r = await analyticsApi.delete(`/watchlist/${id}`); return r.data },

  // Alerts
  getAlerts: async (params = {}) => { const r = await analyticsApi.get('/alerts', { params }); return r.data },
  acknowledgeAlert: async (id) => { const r = await analyticsApi.patch(`/alerts/${id}/acknowledge`); return r.data },

  // Vehicle route
  getVehicleRoute: async (plate) => { const r = await analyticsApi.get(`/vehicles/${encodeURIComponent(plate)}/route`); return r.data },
  searchPlates: async (prefix) => { const r = await analyticsApi.get('/vehicles/search', { params: { plate_text: prefix } }); return r.data },

  // Workers
  getWorkers: async () => { const r = await analyticsApi.get('/ingest/workers'); return r.data },
  startWorker: async (data) => { const r = await analyticsApi.post('/ingest/workers', data); return r.data },
  stopWorker: async (id) => { const r = await analyticsApi.delete(`/ingest/workers/${id}`); return r.data },

  // Video test upload
  uploadVideoTest: async (formData) => {
    const r = await analyticsApi.post('/anpr/upload-test', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return r.data
  },
  getVideoTestResult: async (jobId) => { const r = await analyticsApi.get(`/anpr/upload-test/${jobId}`); return r.data },
}

// ─────────────────────────────────────────────────────────────────────────────
// Streaming Service API (streaming-svc at /api/streaming/v1)
// ─────────────────────────────────────────────────────────────────────────────
const streamingApi = axios.create({
  baseURL: '/api/streaming/v1',
})

streamingApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

streamingApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const streamingAPI = {
  // Streams
  listStreams: async (params = {}) => { const r = await streamingApi.get('/streams/', { params }); return r.data },
  createStream: async (data) => { const r = await streamingApi.post('/streams/', data); return r.data },
  getStream: async (id) => { const r = await streamingApi.get(`/streams/${id}`); return r.data },
  updateStream: async (id, data) => { const r = await streamingApi.put(`/streams/${id}`, data); return r.data },
  deleteStream: async (id) => { const r = await streamingApi.delete(`/streams/${id}`); return r.data },
  checkHealth: async (id) => { const r = await streamingApi.post(`/streams/${id}/health-check`); return r.data },

  // Live sessions
  startSession: async (streamId, quality = 'sub') => { const r = await streamingApi.post(`/live/${streamId}/start`, { quality }); return r.data },
  heartbeat: async (sessionId) => { const r = await streamingApi.post(`/live/${sessionId}/heartbeat`); return r.data },
  stopSession: async (sessionId) => { const r = await streamingApi.post(`/live/${sessionId}/stop`); return r.data },
  getSessionStatus: async (sessionId) => { const r = await streamingApi.get(`/live/${sessionId}/status`); return r.data },

  // Health
  getHealthSummary: async () => { const r = await streamingApi.get('/health/summary'); return r.data },
}
