'use client'
/**
 * Reports page — sales analytics with date-range filter, KPIs, daily series,
 * top products, and CSV export.
 *
 * Pulls data from /api/pos/reports/sales. The endpoint already aggregates
 * everything we need; this page is purely presentational.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  BarChart3,
  CircleDollarSign,
  CreditCard,
  Download,
  Loader2,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/pos'
import { RevenueTrendChart } from './RevenueTrendChart'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'

type SalesReport = {
  range: { from: string; to: string }
  totals: {
    gross: number
    tax: number
    discount: number
    tip: number
    count: number
    cash: number
    card: number
    transfer: number
  }
  series: Array<{ date: string; revenue: number; orders: number }>
  topProducts: Array<{
    productId: string | null
    name: string
    qty: number
    revenue: number
  }>
  averageTicket: number
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function ReportsPage() {
  const today = useMemo(() => {
    const t = new Date()
    t.setHours(23, 59, 59, 999)
    return t
  }, [])
  const weekAgo = useMemo(() => {
    const t = new Date()
    t.setDate(t.getDate() - 6)
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const [from, setFrom] = useState<string>(isoDate(weekAgo))
  const [to, setTo] = useState<string>(isoDate(today))
  const [report, setReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const fromDate = new Date(from + 'T00:00:00')
      const toDate = new Date(to + 'T23:59:59')
      const res = await fetch(
        `/api/pos/reports/sales?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`,
        { credentials: 'include' }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setReport(await res.json())
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить'
      )
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  const exportCsv = () => {
    if (!report) return
    const rows: string[][] = [
      ['Дата', 'Выручка', 'Заказов'],
      ...report.series.map((s) => [
        s.date,
        String(s.revenue),
        String(s.orders),
      ]),
    ]
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales_${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Отчёты"
        icon={<BarChart3 className="h-4 w-4 text-amber-500" />}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!report}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </Button>
            <RefreshButton onClick={load} loading={loading} />
          </>
        }
      />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        {/* Date range */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Период</CardTitle>
            <CardDescription>Выберите даты для анализа продаж</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  С
                </Label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  По
                </Label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end gap-1">
                <QuickRange
                  label="7д"
                  onClick={() => {
                    const d = new Date()
                    setTo(isoDate(d))
                    d.setDate(d.getDate() - 6)
                    setFrom(isoDate(d))
                  }}
                />
                <QuickRange
                  label="30д"
                  onClick={() => {
                    const d = new Date()
                    setTo(isoDate(d))
                    d.setDate(d.getDate() - 29)
                    setFrom(isoDate(d))
                  }}
                />
                <QuickRange
                  label="Месяц"
                  onClick={() => {
                    const d = new Date()
                    setTo(isoDate(d))
                    setFrom(isoDate(new Date(d.getFullYear(), d.getMonth(), 1)))
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi
            icon={<CircleDollarSign className="h-4 w-4" />}
            label="Выручка"
            value={
              loading ? '—' : formatCurrency(report?.totals.gross ?? 0, 'UZS')
            }
            tone="primary"
          />
          <Kpi
            icon={<ShoppingCart className="h-4 w-4" />}
            label="Заказов"
            value={loading ? '—' : String(report?.totals.count ?? 0)}
          />
          <Kpi
            icon={<TrendingUp className="h-4 w-4" />}
            label="Средний чек"
            value={
              loading
                ? '—'
                : formatCurrency(report?.averageTicket ?? 0, 'UZS')
            }
          />
          <Kpi
            icon={<CreditCard className="h-4 w-4" />}
            label="Налог собран"
            value={
              loading ? '—' : formatCurrency(report?.totals.tax ?? 0, 'UZS')
            }
          />
        </section>

        {/* Payment mix + Top products */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Способы оплаты</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !report ? (
                <div className="grid place-items-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <PaymentMix totals={report.totals} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Топ-товары</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !report ? (
                <div className="grid place-items-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : report.topProducts.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Пока нет данных
                </p>
              ) : (
                <ol className="space-y-1.5">
                  {report.topProducts.map((p, i) => {
                    const max = Math.max(
                      1,
                      ...report.topProducts.map((x) => x.revenue)
                    )
                    const pct = (p.revenue / max) * 100
                    return (
                      <li key={p.productId ?? i}>
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
                              {i + 1}
                            </span>
                            <span className="font-medium">{p.name}</span>
                          </div>
                          <div className="text-right text-xs">
                            <div className="font-semibold tabular-nums">
                              {formatCurrency(p.revenue, 'UZS')}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {p.qty} шт.
                            </div>
                          </div>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-amber-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trend chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Тренд выручки</CardTitle>
            <CardDescription className="text-xs">
              Выручка (слева) и количество заказов (справа) по дням
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading || !report ? (
              <div className="grid place-items-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <RevenueTrendChart series={report.series} />
            )}
          </CardContent>
        </Card>

        {/* Daily table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Динамика по дням</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading || !report ? (
              <div className="grid place-items-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : report.series.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Нет данных
              </p>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Дата</th>
                      <th className="px-4 py-2 text-right">Заказы</th>
                      <th className="px-4 py-2 text-right">Выручка</th>
                      <th className="px-4 py-2 text-right">Средний чек</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...report.series]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((s) => (
                        <tr key={s.date} className="hover:bg-accent/30">
                          <td className="px-4 py-2 tabular-nums">{s.date}</td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {s.orders}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-medium">
                            {formatCurrency(s.revenue, 'UZS')}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                            {formatCurrency(
                              s.orders ? s.revenue / s.orders : 0,
                              'UZS'
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

// Local Kpi adapter — maps the page's 'primary' tone to KpiTile's 'amber'.
function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: 'primary'
}) {
  return (
    <KpiTile
      icon={icon}
      label={label}
      value={value}
      tone={tone === 'primary' ? 'amber' : 'neutral'}
    />
  )
}

function PaymentMix({
  totals,
}: {
  totals: SalesReport['totals']
}) {
  const total = Math.max(1, totals.cash + totals.card + totals.transfer)
  const rows: Array<{ label: string; value: number; color: string }> = [
    { label: 'Наличные', value: totals.cash, color: 'bg-emerald-500' },
    { label: 'Карта', value: totals.card, color: 'bg-blue-500' },
    { label: 'Перевод', value: totals.transfer, color: 'bg-violet-500' },
  ]
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {rows.map((r) => (
          <div
            key={r.label}
            className={cn('h-full', r.color)}
            style={{ width: `${(r.value / total) * 100}%` }}
            title={`${r.label}: ${formatCurrency(r.value, 'UZS')}`}
          />
        ))}
      </div>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-full', r.color)} />
              <span>{r.label}</span>
            </div>
            <span className="tabular-nums font-medium">
              {formatCurrency(r.value, 'UZS')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function QuickRange({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button size="sm" variant="ghost" onClick={onClick} className="h-9">
      {label}
    </Button>
  )
}
