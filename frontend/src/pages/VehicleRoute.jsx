import React, { useState, useEffect, useCallback } from 'react'
import {
  Row, Col, Card, Button, Input, Tag, Timeline, Modal,
  Typography, Spin, Empty, Descriptions, message, Badge, Space,
} from 'antd'
import { SearchOutlined, CameraOutlined } from '@ant-design/icons'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'leaflet/dist/leaflet.css'
import { analyticsAPI } from '../services/api.js'

dayjs.extend(relativeTime)

const { Title, Text } = Typography

// Color gradient from green (first) to red (last) by index
function sightingColor(index, total) {
  if (total <= 1) return '#52c41a'
  const ratio = index / (total - 1)
  const r = Math.round(82 + (207 - 82) * ratio)
  const g = Math.round(196 + (30 - 196) * ratio)
  const b = Math.round(26 + (34 - 26) * ratio)
  return `rgb(${r},${g},${b})`
}

function confidenceLabel(conf) {
  if (conf == null) return null
  const pct = Math.round(conf * 100)
  const color = conf >= 0.9 ? 'green' : conf >= 0.7 ? 'orange' : 'red'
  return <Tag color={color}>{pct}%</Tag>
}

// Auto-fit map bounds to sightings
function BoundsController({ sightings }) {
  const map = useMap()
  useEffect(() => {
    const pts = sightings.filter((s) => s.latitude != null && s.longitude != null)
    if (pts.length === 0) return
    if (pts.length === 1) {
      map.setView([pts[0].latitude, pts[0].longitude], 14)
      return
    }
    const lats = pts.map((s) => s.latitude)
    const lngs = pts.map((s) => s.longitude)
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [40, 40] }
    )
  }, [sightings, map])
  return null
}

export default function VehicleRoute() {
  const { plate: paramPlate } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const initialPlate = paramPlate ?? searchParams.get('plate') ?? ''
  const [inputPlate, setInputPlate] = useState(initialPlate.toUpperCase())
  const [trackedPlate, setTrackedPlate] = useState('')
  const [routeData, setRouteData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [frameModal, setFrameModal] = useState({ open: false, sighting: null })

  const fetchRoute = useCallback(async (plate) => {
    if (!plate) return
    setLoading(true)
    try {
      const data = await analyticsAPI.getVehicleRoute(plate)
      setRouteData(data)
      setTrackedPlate(plate)
    } catch (err) {
      if (err?.response?.status === 404) {
        setRouteData({ plate_text: plate, total_sightings: 0, sightings: [] })
        setTrackedPlate(plate)
      } else {
        message.error('Failed to fetch vehicle route')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialPlate) fetchRoute(initialPlate.toUpperCase())
  }, []) // eslint-disable-line

  const handleTrack = () => {
    const plate = inputPlate.trim().toUpperCase()
    if (!plate) { message.warning('Enter a plate number'); return }
    navigate(`/vehicle-route/${plate}`, { replace: true })
    fetchRoute(plate)
  }

  const sightings = routeData?.sightings ?? []
  const mapSightings = sightings.filter((s) => s.latitude != null && s.longitude != null)
  const polylinePositions = mapSightings.map((s) => [s.latitude, s.longitude])

  const defaultCenter = mapSightings.length > 0
    ? [mapSightings[0].latitude, mapSightings[0].longitude]
    : [23.0225, 72.5714] // Ahmedabad fallback

  return (
    <div>
      {/* Search bar */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder="Enter plate number (e.g. GJ05AB1234)"
            value={inputPlate}
            onChange={(e) => setInputPlate(e.target.value.toUpperCase())}
            onPressEnter={handleTrack}
            style={{ width: 280, fontFamily: 'monospace', textTransform: 'uppercase' }}
            prefix={<SearchOutlined />}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleTrack} loading={loading}>
            Track
          </Button>
        </Space>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" tip="Fetching route data..." />
        </div>
      )}

      {!loading && !trackedPlate && (
        <Empty description="Enter a plate number above to track vehicle route" />
      )}

      {!loading && trackedPlate && routeData && (
        <Row gutter={16}>
          {/* Left panel — timeline */}
          <Col xs={24} md={10}>
            <Card
              title={
                <Space>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 18, color: '#cf1322' }}>
                    {(routeData.plate_text ?? trackedPlate).toUpperCase()}
                  </span>
                  {routeData.in_watchlist && <Badge status="error" text="Watchlist" />}
                </Space>
              }
              style={{ height: '100%' }}
            >
              {/* Summary */}
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">Total sightings: </Text>
                <Text strong>{routeData.total_sightings ?? sightings.length}</Text>
                {sightings.length > 0 && (
                  <>
                    <br />
                    <Text type="secondary">First seen: </Text>
                    <Text>{dayjs(sightings[0].detected_at).format('DD MMM YYYY HH:mm:ss')}</Text>
                    <br />
                    <Text type="secondary">Last seen: </Text>
                    <Text>{dayjs(sightings[sightings.length - 1].detected_at).format('DD MMM YYYY HH:mm:ss')}</Text>
                  </>
                )}
              </div>

              {sightings.length === 0 ? (
                <Empty description={`No sightings found for ${trackedPlate}`} />
              ) : (
                <div style={{ maxHeight: 560, overflowY: 'auto', paddingRight: 4 }}>
                  <Timeline
                    items={sightings.map((s, i) => ({
                      color: sightingColor(i, sightings.length),
                      children: (
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {dayjs(s.detected_at).format('DD MMM YYYY HH:mm:ss')}
                          </div>
                          <div style={{ color: '#555' }}>
                            {s.camera_id_label ?? s.camera_id}
                          </div>
                          {s.location_name && (
                            <div style={{ color: '#888', fontSize: 12 }}>{s.location_name}</div>
                          )}
                          <Space size={4} style={{ marginTop: 4 }}>
                            {confidenceLabel(s.confidence)}
                            <Button
                              size="small"
                              icon={<CameraOutlined />}
                              onClick={() => setFrameModal({ open: true, sighting: s })}
                            >
                              View Frame
                            </Button>
                          </Space>
                        </div>
                      ),
                    }))}
                  />
                </div>
              )}
            </Card>
          </Col>

          {/* Right panel — map */}
          <Col xs={24} md={14}>
            <Card title="Route Map" style={{ height: '100%' }}>
              {mapSightings.length === 0 ? (
                <Empty description="No geo-located sightings available" style={{ padding: 60 }} />
              ) : (
                <MapContainer
                  center={defaultCenter}
                  zoom={13}
                  style={{ height: 560, borderRadius: 8 }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <BoundsController sightings={mapSightings} />

                  {/* Route polyline */}
                  {polylinePositions.length > 1 && (
                    <Polyline
                      positions={polylinePositions}
                      pathOptions={{ color: '#1677ff', weight: 2, dashArray: '6 4', opacity: 0.8 }}
                    />
                  )}

                  {/* Sighting markers */}
                  {mapSightings.map((s, i) => (
                    <CircleMarker
                      key={i}
                      center={[s.latitude, s.longitude]}
                      radius={10}
                      pathOptions={{
                        fillColor: sightingColor(i, mapSightings.length),
                        color: '#fff',
                        weight: 2,
                        fillOpacity: 0.9,
                      }}
                    >
                      <Popup>
                        <div>
                          <strong>#{i + 1}</strong><br />
                          <strong>Camera:</strong> {s.camera_id_label ?? s.camera_id}<br />
                          <strong>Time:</strong> {dayjs(s.detected_at).format('DD MMM YYYY HH:mm:ss')}<br />
                          {s.confidence != null && (
                            <><strong>Confidence:</strong> {Math.round(s.confidence * 100)}%<br /></>
                          )}
                          {s.location_name && (
                            <><strong>Location:</strong> {s.location_name}</>
                          )}
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* Frame modal */}
      <Modal
        open={frameModal.open}
        title={
          frameModal.sighting ? (
            <span>
              Frame — {frameModal.sighting.camera_id_label ?? frameModal.sighting.camera_id}
            </span>
          ) : 'Frame'
        }
        onCancel={() => setFrameModal({ open: false, sighting: null })}
        footer={null}
        width={640}
      >
        {frameModal.sighting && (
          <>
            <img
              src={analyticsAPI.getFrameUrl(frameModal.sighting.event_id ?? frameModal.sighting.id)}
              alt="ANPR Frame"
              style={{ width: '100%', borderRadius: 8, marginBottom: 16 }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Camera">
                {frameModal.sighting.camera_id_label ?? frameModal.sighting.camera_id}
              </Descriptions.Item>
              <Descriptions.Item label="Time">
                {dayjs(frameModal.sighting.detected_at).format('DD MMM YYYY HH:mm:ss')}
              </Descriptions.Item>
              {frameModal.sighting.location_name && (
                <Descriptions.Item label="Location" span={2}>
                  {frameModal.sighting.location_name}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Confidence">
                {confidenceLabel(frameModal.sighting.confidence)}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </div>
  )
}
