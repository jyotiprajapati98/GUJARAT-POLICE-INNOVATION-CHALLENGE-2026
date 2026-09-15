import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { authAPI } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const me = await authAPI.getMe()
      setUser(me)
    } catch {
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  const login = async (email, password) => {
    const data = await authAPI.login(email, password)
    localStorage.setItem('token', data.access_token)
    const me = await authAPI.getMe()
    setUser(me)
    message.success(`Welcome back, ${me.full_name || me.email}!`)
    navigate('/dashboard')
  }

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
    message.info('You have been logged out.')
    navigate('/login')
  }, [navigate])

  const isAuthenticated = !!user && !!localStorage.getItem('token')

  const hasRole = (roles) => {
    if (!user) return false
    return roles.includes(user.role)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, loading, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
