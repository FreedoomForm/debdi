/** Module 23: Route Optimizer (ORS / OSRM) */
export type RoutePoint = {
  id: string
  lat: number
  lng: number
  type: 'pickup' | 'dropoff'
  orderId?: string
  windowStart?: string
  windowEnd?: string
}

export type OptimizedRoute = {
  courierId: string
  points: RoutePoint[]
  totalDistanceKm: number
  totalDurationMin: number
  polyline: string
}

export async function optimizeRoute(courierId: string, points: RoutePoint[]) {
  const r = await fetch('/api/admin/route-optimize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ courierId, points }),
  })
  return r.json()
}

export async function fetchPolyline(start: [number, number], end: [number, number]) {
  const r = await fetch('/api/admin/dispatch/ors-polyline', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ start, end }),
  })
  return r.json()
}
