/** Module 12: Dispatch / Live Map */
export type DispatchOrder = {
  id: string
  status: string
  pickup: { lat: number; lng: number; name: string }
  dropoff: { lat: number; lng: number; address: string }
  courierId?: string
  priority: number
  eta?: number
}

export async function fetchDispatchBoard(date: string) {
  const r = await fetch(`/api/admin/dispatch?date=${date}`)
  return r.json()
}

export async function startDispatchDay() {
  const r = await fetch('/api/admin/dispatch/start-day', { method: 'POST' })
  return r.json()
}

export async function optimizeDispatchRoutes(orderIds: string[], courierIds: string[]) {
  const r = await fetch('/api/admin/dispatch/ors-optimize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orderIds, courierIds }),
  })
  return r.json()
}
