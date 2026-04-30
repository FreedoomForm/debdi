/** Module 02: Dashboard / Home Overview - inspired by admin.lume.uz */
export type DashboardKpi = {
  id: string
  label: string
  value: number
  delta: number
  trend: 'up' | 'down' | 'flat'
  format: 'money' | 'count' | 'percent'
}

export type DashboardData = {
  kpis: DashboardKpi[]
  revenueSeries: { date: string; revenue: number; expenses: number }[]
  ordersByStatus: { status: string; count: number }[]
  recentActivity: { id: string; user: string; action: string; at: string }[]
}

export const DEFAULT_KPIS: DashboardKpi[] = [
  { id: 'revenue', label: 'Выручка', value: 0, delta: 0, trend: 'flat', format: 'money' },
  { id: 'orders', label: 'Заказы', value: 0, delta: 0, trend: 'flat', format: 'count' },
  { id: 'clients', label: 'Клиенты', value: 0, delta: 0, trend: 'flat', format: 'count' },
  { id: 'avgCheck', label: 'Средний чек', value: 0, delta: 0, trend: 'flat', format: 'money' },
]

export async function fetchDashboard(range = '30d'): Promise<DashboardData> {
  const r = await fetch(`/api/admin/statistics?range=${range}`, { cache: 'no-store' })
  if (!r.ok) throw new Error('Не удалось загрузить дашборд')
  return r.json()
}
