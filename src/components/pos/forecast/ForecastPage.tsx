'use client'
/**
 * /pos/forecast — demand forecast dashboard.
 *
 * Surfaces /api/pos/reports/forecast which had no UI before. Shows the
 * 7-day-ahead forecast (configurable) of revenue, orders, average ticket
 * and the top product quantities, plus a confidence bar derived from the
 * sample depth per day-of-week.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  BarChart3,
  Calendar,
  Loader2,
  Package,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { formatCurrency } from '@/lib/pos'

type ForecastDay = {
  date: string
  dow: number
  revenue: number
  orders: number
  avgTicket: number
  confidence: number
}

type ForecastResponse = {
  meta: {
    lookbackDays: number
    horizonDays: number
    sampleDays: number
    sampleOrders: number
    generatedAt: string
    algorithm: string
  }
  forecast: ForecastDay[]
  totals: {
    revenue: number
    orders: number
    avgTicket: number
  }
  products: Array<{
    productId: string | null
    name: string
    avgPerDay: number
    nextWeek: number
  }>
}

const DOW_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export default function ForecastPage() {
  const [data, setData] = useState<ForecastResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [horizon, setHorizon] = useState(7)
  const [lookback, setLookback] = useState(56)
  const [topProducts, setTopProducts] = useState(8)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        horizon: String(horizon),
        lookback: String(lookback),
        topProducts: String(topProducts),
      })
      const res = await fetch(`/api/pos/reports/forecast?${params}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const payload = (await res.json()) as ForecastResponse
      setData(payload)
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить'
      )
    } finally {
      setLoading(false)
    }
  }, [horizon, lookback, topProducts])

  useEffect(() => {
    load()
  }, [load])

  const maxRevenue = useMemo(
    () =>
      data?.forecast.length
        ? Math.max(...data.forecast.map((f) => f.revenue), 1)
        : 1,
    [data?.forecast]
  )

  const maxProductQty = useMemo(
    () =>
      data?.products.length
        ? Math.max(...data.products.map((p) => p.nextWeek), 1)
        : 1,
    [data?.products]
  )

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Прогноз спроса"
        icon={<Sparkles className="h-4 w-4 text-amber-500" />}
        backHref="/pos/reports"
        badge={data ? `${data.meta.horizonDays} дн.` : undefined}
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              Параметры прогноза
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Горизонт (дни)
              </Label>
              <Select
                value={String(horizon)}
                onValueChange={(v) => setHorizon(Number(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 7, 14, 21, 30].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} дней вперёд
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                История (дни)
              </Label>
              <Select
                value={String(lookback)}
                onValueChange={(v) => setLookback(Number(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[14, 28, 56, 90, 120, 180].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      Последние {n} дней
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Топ-товаров
              </Label>
              <Select
                value={String(topProducts)}
                onValueChange={(v) => setTopProducts(Number(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 8, 12, 15, 20].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} позиций
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.forecast.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Недостаточно данных для прогноза. Проведите хотя бы несколько
              заказов, и алгоритм автоматически начнёт строить прогноз.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiTile
                label="Прогноз выручки"
                value={formatCurrency(data.totals.revenue, 'UZS')}
                icon={<TrendingUp className="h-4 w-4" />}
                tone="emerald"
                hint={`на ${data.meta.horizonDays} дн. вперёд`}
              />
              <KpiTile
                label="Заказы"
                value={String(data.totals.orders)}
                icon={<Users className="h-4 w-4" />}
                tone="cyan"
                hint="Сумма по всем дням"
              />
              <KpiTile
                label="Средний чек"
                value={formatCurrency(data.totals.avgTicket, 'UZS')}
                icon={<BarChart3 className="h-4 w-4" />}
                tone="amber"
                hint="revenue / orders"
              />
              <KpiTile
                label="История"
                value={`${data.meta.sampleDays} дн.`}
                icon={<Calendar className="h-4 w-4" />}
                tone="violet"
                hint={`${data.meta.sampleOrders} заказов`}
              />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Прогноз по дням ({data.forecast.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.forecast.map((f) => {
                  const w = (f.revenue / maxRevenue) * 100
                  return (
                    <div
                      key={f.date}
                      className="rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-md bg-amber-50 text-amber-700">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">
                              {DOW_LABELS[f.dow]} ·{' '}
                              {new Date(f.date).toLocaleDateString('ru-RU', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {f.orders} заказов · средний чек{' '}
                              {formatCurrency(f.avgTicket, 'UZS')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-bold tabular-nums">
                            {formatCurrency(f.revenue, 'UZS')}
                          </div>
                          <div
                            className={cn(
                              'text-[10px] uppercase tracking-wider',
                              f.confidence >= 0.75
                                ? 'text-emerald-700'
                                : f.confidence >= 0.4
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                            )}
                          >
                            {Math.round(f.confidence * 100)}% уверенность
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
                          style={{ width: `${w}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4" />
                  Топ товаров на ближайшие {data.meta.horizonDays} дн.
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.products.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Нет данных по продуктам.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.products.map((p, idx) => {
                      const w = (p.nextWeek / maxProductQty) * 100
                      return (
                        <li
                          key={`${p.productId ?? p.name}-${idx}`}
                          className="rounded-md border border-border bg-card px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 tabular-nums">
                                  {idx + 1}
                                </span>
                                <span className="truncate">{p.name}</span>
                              </div>
                              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full bg-emerald-500"
                                  style={{ width: `${w}%` }}
                                />
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-bold tabular-nums">
                                {p.nextWeek}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                ≈ {p.avgPerDay}/день
                              </div>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardContent className="flex items-start gap-3 p-3 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  Алгоритм: <code className="font-mono">{data.meta.algorithm}</code>.
                  Обновлён{' '}
                  {new Date(data.meta.generatedAt).toLocaleString('ru-RU')}.
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
