/** Module 11: Couriers */
export type Courier = {
  id: string
  name: string
  phone: string
  status: 'online' | 'busy' | 'offline'
  currentOrders: number
  completedToday: number
  rating: number
  vehicle?: 'bike' | 'car' | 'foot'
  location?: { lat: number; lng: number }
  earningsToday: number
  earningsTotal: number
}

export async function listCouriers() {
  const r = await fetch('/api/admin/couriers')
  return r.json()
}

export async function getCourierLiveLocation(id: string) {
  const r = await fetch(`/api/admin/live-map?courier=${id}`)
  return r.json()
}
