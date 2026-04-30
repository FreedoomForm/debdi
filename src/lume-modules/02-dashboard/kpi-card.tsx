'use client'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { DashboardKpi } from './index'
import { formatMoney } from '../_shared'

export function KpiCard({ kpi }: { kpi: DashboardKpi }) {
  const TrendIcon = kpi.trend === 'up' ? ArrowUp : kpi.trend === 'down' ? ArrowDown : Minus
  const trendColor =
    kpi.trend === 'up' ? 'text-emerald-600 bg-emerald-50' : kpi.trend === 'down' ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-100'
  const formatted =
    kpi.format === 'money' ? formatMoney(kpi.value) : kpi.format === 'percent' ? `${kpi.value}%` : kpi.value.toLocaleString('ru-RU')
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
      <p className="text-sm text-slate-500">{kpi.label}</p>
      <h3 className="mt-2 text-2xl font-bold tracking-tight">{formatted}</h3>
      <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${trendColor}`}>
        <TrendIcon className="h-3 w-3" />
        {kpi.delta >= 0 ? '+' : ''}{kpi.delta}%
      </div>
    </div>
  )
}
