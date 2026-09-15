import React, { useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button, Typography, Space, Tag, Badge } from 'antd'
import { useNavigate } from 'react-router-dom'

const { Text, Title } = Typography

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const STATUS_COLOR = {
  active: '#52c41a',
  inactive: '#8c8c8c',
  faulty: '#ff4d4f',
  under_maintenance: '#fa8c16',
  decommissioned: '#434343',
  planned: '#1677ff',
}

const STATUS_LABEL = {
  active: 'Active',
  inactive: 'Inactive',
  faulty: 'Faulty',
  under_maintenance: 'Under Maintenance',
  decommissioned: 'Decommissioned',
  planned: 'Planned',
}

const TYPE_EMOJI = {
  dome: '🔵',
  bullet: '🟡',
  ptz: '🔴',
  fisheye: '🟣',
  box: '⬜',
  thermal: '🔶',
  other: '⚪',
}

// Delhi center coordinates
const DEFAULT_CENTER = [28.6139, 77.209]
const DEFAULT_ZOOM = 11

function CameraMarker({ feature, onCameraClick }) {
  const navigate = useNavigate()
  const props = feature.properties || {}
  const coords = feature.geometry?.coordinates

  if (!coords || coords.length < 2) return null

  // GeoJSON coordinates are [longitude, latitude]
  const lat = coords[1]
  const lng = coords[0]

  if (isNaN(lat) || isNaN(lng)) return null

  const color = STATUS_COLOR[props.status] || '#8c8c8c'
  const opacity = props.status === 'decommissioned' ? 0.5 : 0.85

  const handleViewDetails = () => {
    if (onCameraClick) {
      onCameraClick(props)
    } else {
      navigate(`/cameras?camera_id=${props.camera_id_label || props.id}`)
    }
  }

  return (
    <CircleMarker
      center={[lat, lng]}
      radius={7}
      pathOptions={{
        color: '#fff',
        weight: 2,
        fillColor: color,
        fillOpacity: opacity,
      }}
    >
      <Popup minWidth={220} maxWidth={280}>
        <div style={{ padding: '4px 0' }}>
          <div style={{ marginBottom: 8 }}>
            <Text code style={{ fontSize: 11, color: '#666' }}>
              {props.camera_id_label || props.id || 'N/A'}
            </Text>
          </div>
          <Title level={5} style={{ margin: '0 0 8px', fontSize: 14 }}>
            {props.name || 'Unnamed Camera'}
          </Title>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Department: </Text>
            <Text style={{ fontSize: 12 }}>{props.department_name || '—'}</Text>
          </div>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Type: </Text>
            <Text style={{ fontSize: 12 }}>
              {TYPE_EMOJI[props.camera_type] || '⚪'} {props.camera_type || '—'}
            </Text>
          </div>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Status: </Text>
            <span
              style={{
                display: 'inline-block',
                padding: '1px 8px',
                borderRadius: 10,
                background: color,
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {STATUS_LABEL[props.status] || props.status || '—'}
            </span>
          </div>
          {props.address && (
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Address: </Text>
              <Text style={{ fontSize: 12 }}>{props.address}</Text>
            </div>
          )}
          <div style={{ marginTop: 10, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
            <Button
              type="primary"
              size="small"
              block
              onClick={handleViewDetails}
            >
              View Details
            </Button>
          </div>
        </div>
      </Popup>
    </CircleMarker>
  )
}

function FitBounds({ cameras }) {
  const map = useMap()

  useEffect(() => {
    if (!cameras?.features?.length) return
    const validCoords = cameras.features
      .filter(
        (f) =>
          f.geometry?.coordinates &&
          f.geometry.coordinates.length >= 2 &&
          !isNaN(f.geometry.coordinates[0]) &&
          !isNaN(f.geometry.coordinates[1])
      )
      .map((f) => [f.geometry.coordinates[1], f.geometry.coordinates[0]])

    if (validCoords.length > 1) {
      try {
        map.fitBounds(validCoords, { padding: [40, 40], maxZoom: 16 })
      } catch {
        // ignore bounds errors
      }
    }
  }, [cameras, map])

  return null
}

export default function MapView({ cameras, onCameraClick }) {
  const features = cameras?.features || []

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {cameras && <FitBounds cameras={cameras} />}

      {features.map((feature, index) => (
        <CameraMarker
          key={feature.properties?.id || index}
          feature={feature}
          onCameraClick={onCameraClick}
        />
      ))}
    </MapContainer>
  )
}
