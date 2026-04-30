'use client'
/**
 * /pos/statistics — modern statistics dashboard built on top of
 * /api/admin/statistics. The legacy /middle-admin?tab=statistics view
 * is preserved untouched — no redirects.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  BarChart3,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  Pause,
  CreditCard,
  Banknote,
  Users,
  Sparkles,
  Salad,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'

type Stats = {
  successfulOrders: number
  failedOrders: number
  pendingOrders: number
  inDeliveryOrders: number
  pausedOrders: number
  prepaidOrders: number
  unpaidOrders: number
  cardOrders: number
  cashOrders: number
  dailyCustomers: number
  evenDayCustomers: number
  oddDayCustomers: number
  specialPreferenceCustomers: number
  orders1200: number
  orders1600: number
  orders2000: number
  orders2500: number
  orders3000: number
  singleItemOrders: number
  multiItemOrders: number
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/statistics', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as Stats
      setStats(data)
    } catch (err) {
      console.error('stats load failed', err)
      toast.error('Не удалось загрузить статистику')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totalOrders = stats
    ? stats.successfulOrders +
      stats.failedOrders +
      stats.pendingOrders +
      stats.inDeliveryOrders +
      stats.pausedOrders
    : 0

  const successRate = totalOrders > 0 && stats ? (stats.successfulOrders / totalOrders) * 100 : 0
  const cardShare =
    stats && stats.cardOrders + stats.cashOrders > 0
      ? (stats.cardOrders / (stats.cardOrders + stats.cashOrders)) * 100
      : 0

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Статистика"
        backHref="/pos/dashboard"
        icon={<BarChart3 className="h-4 w-4 text-amber-600" />}
        actions={
          <RefreshButton onClick={load} loading={loading} />
        }
      />

      <main className="space-y-4 p-4 lg:p-6">

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Всего заказов"
          value={totalOrders}
          icon={<BarChart3 className="h-4 w-4" />}
          tone="neutral"
          hint={`${stats?.successfulOrders ?? 0} доставлено`}
        />
        <KpiTile
          label="Доля успеха"
          value={`${successRate.toFixed(1)}%`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone={successRate >= 80 ? 'emerald' : successRate >= 50 ? 'amber' : 'rose'}
          hint="доставлено / всего"
        />
        <KpiTile
          label="Картой"
          value={`${cardShare.toFixed(1)}%`}
          icon={<CreditCard className="h-4 w-4" />}
          tone="emerald"
          hint={`${stats?.cardOrders ?? 0} оплат картой`}
        />
        <KpiTile
          label="Спец. предпочтения"
          value={stats?.specialPreferenceCustomers ?? 0}
          icon={<Sparkles className="h-4 w-4" />}
          tone="neutral"
          hint="клиентов с настройками"
        />
      </div>

      {/* Order statuses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Статусы заказов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat
              label="Доставлено"
              value={stats?.successfulOrders ?? 0}
              tone="emerald"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <Stat
              label="В доставке"
              value={stats?.inDeliveryOrders ?? 0}
              tone="indigo"
              icon={<Truck className="h-4 w-4" />}
            />
            <Stat
              label="Ожидает"
              value={stats?.pendingOrders ?? 0}
              tone="slate"
              icon={<Clock className="h-4 w-4" />}
            />
            <Stat
              label="На паузе"
              value={stats?.pausedOrders ?? 0}
              tone="zinc"
              icon={<Pause className="h-4 w-4" />}
            />
            <Stat
              label="Сбой"
              value={stats?.failedOrders ?? 0}
              tone="rose"
              icon={<XCircle className="h-4 w-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment + customer rhythm */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Оплаты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label="Предоплачено"
                value={stats?.prepaidOrders ?? 0}
                tone="emerald"
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <Stat
                label="К оплате"
                value={stats?.unpaidOrders ?? 0}
                tone="rose"
                icon={<XCircle className="h-4 w-4" />}
              />
              <Stat
                label="Картой"
                value={stats?.cardOrders ?? 0}
                tone="indigo"
                icon={<CreditCard className="h-4 w-4" />}
              />
              <Stat
                label="Наличные"
                value={stats?.cashOrders ?? 0}
                tone="amber"
                icon={<Banknote className="h-4 w-4" />}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ритм доставки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <Stat
                label="Ежедневные"
                value={stats?.dailyCustomers ?? 0}
                tone="emerald"
                icon={<Users className="h-4 w-4" />}
              />
              <Stat
                label="Чётные дни"
                value={stats?.evenDayCustomers ?? 0}
                tone="indigo"
                icon={<Users className="h-4 w-4" />}
              />
              <Stat
                label="Нечётные"
                value={stats?.oddDayCustomers ?? 0}
                tone="amber"
                icon={<Users className="h-4 w-4" />}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calorie distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Salad className="h-4 w-4 text-emerald-600" />
            Калорийность заказов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="1200 ккал" value={stats?.orders1200 ?? 0} tone="emerald" />
            <Stat label="1600 ккал" value={stats?.orders1600 ?? 0} tone="emerald" />
            <Stat label="2000 ккал" value={stats?.orders2000 ?? 0} tone="amber" />
            <Stat label="2500 ккал" value={stats?.orders2500 ?? 0} tone="amber" />
            <Stat label="3000 ккал" value={stats?.orders3000 ?? 0} tone="rose" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat label="Один пакет (qty=1)" value={stats?.singleItemOrders ?? 0} tone="slate" />
            <Stat label="Несколько пакетов (qty≥2)" value={stats?.multiItemOrders ?? 0} tone="slate" />
          </div>
        </CardContent>
      </Card>
      </main>
    </div>
  )
}

// Local KPI alias — single source of truth lives in @/components/pos/shared/KpiTile.
const KPI = KpiTile

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: 'emerald' | 'rose' | 'amber' | 'indigo' | 'slate' | 'zinc'
  icon?: React.ReactNode
}) {
  const toneClass = {
    emerald: 'border-emerald-200 bg-emerald-50/60 text-emerald-900',
    rose: 'border-rose-200 bg-rose-50/60 text-rose-900',
    amber: 'border-amber-200 bg-amber-50/60 text-amber-900',
    indigo: 'border-indigo-200 bg-indigo-50/60 text-indigo-900',
    slate: 'border-slate-200 bg-slate-50/60 text-slate-900',
    zinc: 'border-zinc-200 bg-zinc-50/60 text-zinc-900',
  }[tone]
  return (
    <div className={cn('rounded-md border p-2.5', toneClass)}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-70">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-base font-bold tabular-nums">{value}</div>
    </div>
  )
}
