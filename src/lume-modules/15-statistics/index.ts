/** Module 15: Statistics & Charts */
export type StatRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'all'

export type SeriesPoint = { date: string; value: number; label?: string }

export async function fetchOrdersOverTime(range: StatRange): Promise<SeriesPoint[]> {
  const r = await fetch(`/api/admin/statistics?metric=orders&range=${range}`)
  return r.json()
}

export async function fetchRevenueOverTime(range: StatRange): Promise<SeriesPoint[]> {
  const r = await fetch(`/api/admin/statistics?metric=revenue&range=${range}`)
  return r.json()
}

export async function fetchTopProducts(limit = 10) {
  const r = await fetch(`/api/admin/statistics?metric=top-products&limit=${limit}`)
  return r.json()
}

export async function fetchCourierPerformance() {
  const r = await fetch('/api/admin/statistics?metric=courier-performance')
  return r.json()
}
