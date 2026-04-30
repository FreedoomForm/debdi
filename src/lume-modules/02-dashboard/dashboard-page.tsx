'use client'
import { useEffect, useState } from 'react'
import { KpiCard } from './kpi-card'
import { DEFAULT_KPIS, fetchDashboard, type DashboardData } from './index'

export function LumeDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetchDashboard().then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])
  const kpis = data?.kpis ?? DEFAULT_KPIS
  return (
    <div className="space-y-6 p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Главная</h1>
          <p className="text-sm text-slate-500">Обзор активности и ключевых метрик</p>
        </div>
      </header>
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.id} kpi={k} />
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="font-semibold mb-3">Выручка</h3>
          <div className="h-64 grid place-items-center text-slate-400 text-sm">
            {loading ? 'Загрузка…' : 'График выручки (Recharts)'}
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="font-semibold mb-3">Заказы по статусам</h3>
          <div className="h-64 grid place-items-center text-slate-400 text-sm">
            {loading ? 'Загрузка…' : 'Donut-чарт'}
          </div>
        </div>
      </section>
    </div>
  )
}
