'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Users, Package, Wallet } from 'lucide-react'
import { fetchFinanceSummary, type FinanceSummary } from './index'
import { formatMoney } from '../_shared'

const TILES: { key: keyof FinanceSummary; label: string; Icon: any; tone: string }[] = [
  { key: 'income', label: 'Доход', Icon: TrendingUp, tone: 'text-emerald-600 bg-emerald-50' },
  { key: 'expenses', label: 'Расходы', Icon: TrendingDown, tone: 'text-red-600 bg-red-50' },
  { key: 'salaries', label: 'Зарплаты', Icon: Users, tone: 'text-violet-600 bg-violet-50' },
  { key: 'ingredients', label: 'Закупки', Icon: Package, tone: 'text-amber-600 bg-amber-50' },
  { key: 'netProfit', label: 'Чистая прибыль', Icon: DollarSign, tone: 'text-blue-600 bg-blue-50' },
  { key: 'pendingPayouts', label: 'К выплате', Icon: Wallet, tone: 'text-slate-600 bg-slate-100' },
]

export function FinanceSummaryGrid({ range = '30d' }: { range?: string }) {
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetchFinanceSummary(range).then(setSummary).catch(() => {}).finally(() => setLoading(false))
  }, [range])
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {TILES.map(({ key, label, Icon, tone }) => (
        <div key={key} className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{label}</p>
            <span className={`p-2 rounded-lg ${tone}`}>
              <Icon className="h-4 w-4" />
            </span>
          </div>
          <h3 className="mt-3 text-2xl font-bold tracking-tight">
            {loading ? '…' : formatMoney(summary?.[key] ?? 0)}
          </h3>
        </div>
      ))}
    </div>
  )
}
