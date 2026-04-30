'use client'
/**
 * CourierMap — Leaflet-based live map of active couriers.
 *
 * Imported dynamically by /pos/delivery/map (ssr: false) because Leaflet
 * touches `window` at module-eval time. Uses OpenStreetMap tiles (free,
 * no API key required).
 */
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type CourierPin = {
  id: string
  name: string
  email?: string
  lat: number
  lng: number
  isOnShift?: boolean
  averageDeliveryMinutes?: number | null
  activeOrdersCount?: number
}

// Tashkent fallback (most users are in UZ)
const DEFAULT_CENTER: [number, number] = [41.3111, 69.2797]

// Custom courier marker — emerald dot with truck silhouette
const buildIcon = (online: boolean) =>
  L.divIcon({
    className: 'courier-pin',
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:${online ? '#10b981' : '#94a3b8'};
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.25);
      display:grid;place-items:center;
      color:white;font-size:13px;
    ">🛵</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })

function FitBounds({ pins }: { pins: CourierPin[] }) {
  const map = useMap()
  useEffect(() => {
    if (pins.length === 0) return
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
  }, [pins, map])
  return null
}

export default function CourierMap({ pins }: { pins: CourierPin[] }) {
  const center = useMemo<[number, number]>(() => {
    if (pins.length === 0) return DEFAULT_CENTER
    const sum = pins.reduce(
      (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
      { lat: 0, lng: 0 }
    )
    return [sum.lat / pins.length, sum.lng / pins.length]
  }, [pins])

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: '100%', width: '100%', borderRadius: 12 }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={buildIcon(Boolean(p.isOnShift))}
        >
          <Popup>
            <div style={{ minWidth: 180 }}>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              {p.email && (
                <div style={{ fontSize: 11, color: '#64748b' }}>{p.email}</div>
              )}
              <div
                style={{
                  marginTop: 6,
                  display: 'flex',
                  gap: 6,
                  fontSize: 11,
                }}
              >
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: 999,
                    background: p.isOnShift ? '#d1fae5' : '#e2e8f0',
                    color: p.isOnShift ? '#065f46' : '#475569',
                  }}
                >
                  {p.isOnShift ? '● На смене' : 'Не на смене'}
                </span>
                {typeof p.activeOrdersCount === 'number' && (
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: 999,
                      background: '#fef3c7',
                      color: '#92400e',
                    }}
                  >
                    Заказов: {p.activeOrdersCount}
                  </span>
                )}
              </div>
              {typeof p.averageDeliveryMinutes === 'number' && (
                <div style={{ marginTop: 4, fontSize: 11, color: '#475569' }}>
                  Средняя доставка: ~{Math.round(p.averageDeliveryMinutes)} мин
                </div>
              )}
              <div style={{ marginTop: 6, fontSize: 10, color: '#94a3b8' }}>
                {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      <FitBounds pins={pins} />
    </MapContainer>
  )
}
