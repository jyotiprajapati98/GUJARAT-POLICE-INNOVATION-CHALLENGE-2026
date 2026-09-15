import Hls from 'hls.js'
import { useEffect, useRef, useState } from 'react'
import { Spin, Alert, Typography } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { streamingAPI } from '../../services/api.js'

const { Text } = Typography

export default function LiveStreamPlayer({ playlistUrl, sessionId, onStop }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef(null)
  const initTimerRef = useRef(null)
  const heartbeatRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const MAX_RETRIES = 15 // 30 seconds at 2s intervals

  useEffect(() => {
    if (!playlistUrl) return

    retryCountRef.current = 0
    setLoading(true)
    setError(null)

    const initHls = () => {
      // Clean up any previous instance
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 10,
        })
        hlsRef.current = hls

        hls.loadSource(playlistUrl)
        hls.attachMedia(videoRef.current)

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false)
          setError(null)
          videoRef.current?.play().catch(() => {})
        })

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            if (retryCountRef.current < MAX_RETRIES) {
              retryCountRef.current += 1
              retryTimerRef.current = setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.loadSource(playlistUrl)
                }
              }, 2000)
            } else {
              setError('Stream unavailable. Check camera connection.')
              setLoading(false)
            }
          }
        })
      } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        videoRef.current.src = playlistUrl
        videoRef.current.addEventListener('loadedmetadata', () => {
          setLoading(false)
          videoRef.current.play().catch(() => {})
        })
        videoRef.current.addEventListener('error', () => {
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current += 1
            retryTimerRef.current = setTimeout(() => {
              videoRef.current.src = playlistUrl
              videoRef.current.load()
            }, 2000)
          } else {
            setError('Stream unavailable. Check camera connection.')
            setLoading(false)
          }
        })
      } else {
        setError('Your browser does not support HLS video playback.')
        setLoading(false)
      }
    }

    // Wait a moment for FFmpeg to start writing segments
    initTimerRef.current = setTimeout(initHls, 3000)

    // Heartbeat every 30s
    heartbeatRef.current = setInterval(async () => {
      if (!sessionId) return
      try {
        await streamingAPI.heartbeat(sessionId)
      } catch (_e) {
        // silently ignore heartbeat failures
      }
    }, 30000)

    return () => {
      clearTimeout(initTimerRef.current)
      clearTimeout(retryTimerRef.current)
      clearInterval(heartbeatRef.current)
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [playlistUrl, sessionId])

  return (
    <div style={{ position: 'relative', width: '100%', background: '#000', borderRadius: 4, overflow: 'hidden' }}>
      {loading && !error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)',
            zIndex: 10,
            gap: 12,
          }}
        >
          <Spin indicator={<LoadingOutlined style={{ fontSize: 36, color: '#fff' }} spin />} />
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
            Waiting for stream to start...
          </Text>
        </div>
      )}

      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)',
            zIndex: 10,
            padding: 24,
          }}
        >
          <Alert
            type="error"
            message="Stream Error"
            description={error}
            style={{ maxWidth: 400 }}
            showIcon
          />
        </div>
      )}

      <video
        ref={videoRef}
        controls
        width="100%"
        style={{ background: '#000', display: 'block', minHeight: 360 }}
      />
    </div>
  )
}
