import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import App from './App.jsx'
import 'antd/dist/reset.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          borderRadius: 6,
          fontFamily: "'Segoe UI', 'Roboto', 'Arial', sans-serif",
        },
        components: {
          Layout: {
            siderBg: '#001529',
            triggerBg: '#002140',
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
)
