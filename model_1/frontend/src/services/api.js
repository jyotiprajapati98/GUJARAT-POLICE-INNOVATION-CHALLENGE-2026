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

export default api
