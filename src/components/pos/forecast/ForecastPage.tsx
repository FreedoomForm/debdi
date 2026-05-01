'use client'
/**
 * /pos/forecast — AI-style demand forecasting dashboard.
 *
 * Surfaces /api/pos/reports/forecast which previously had no UI. Lets
 * managers tune lookback / horizon / topN and see:
 *   • next-period revenue + orders forecast
 *   • per-day breakdown with confidence
 *   • top products expected demand
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  BarChart3,
  Brain,
  Calendar,
  ChartLine,
  Loader2,
  Package,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { formatCurrency } from '@/lib/pos'

type DayForecast = {
  date: string
  dow: number
  revenue: number
  orders: number
  avgTicket: number
  confidence: number
}

type ProductForecast = {
  productId: string | null
  name: string
  avgPerDay: number
  nextWeek: number
}

type Response = {
  meta: {
    lookbackDays: number
    horizonDays: number
    sampleDays: number
    sampleOrders: number
    generatedAt: string
    algorithm: string
  }
  forecast: DayForecast[]
  totals: { revenue: number; orders: number; avgTicket: number }
  products: ProductForecast[]
}

const DOW_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export default function ForecastPage() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [lookback, setLookback] = useState(56)
  const [horizon, setHorizon] = useState(7)
  const [topProducts, setTopProducts] = useState(8)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        lookback: String(lookback),
        horizon: String(horizon),
        topProducts: String(topProducts),
      })
      const res = await fetch(
        `/api/pos/reports/forecast?${params.toString()}`,
        { credentials: 'include', cache: 'no-store' }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as Response
      setData(json)
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить'
      )
    } finally {
      setLoading(false)
    }
  }, [lookback, horizon, topProducts])

  useEffect(() => {
    load()
  }, [load])

  const peakDay = useMemo(() => {
    if (!data?.forecast?.length) return null
    return [...data.forecast].sort((a, b) => b.revenue - a.revenue)[0]
  }, [data])

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Прогноз спроса"
        icon={<Brain className="h-4 w-4 text-amber-500" />}
        backHref="/pos/reports"
        badge="AI"
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Параметры модели
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Глубина истории (дней)</Label>
                <Input
                  type="number"
                  min={14}
                  max={180}
                  value={lookback}
                  onChange={(e) =>
                    setLookback(
                      Math.max(14, Math.min(180, Number(e.target.value) || 14))
                    )
                  }
                  className="mt-1"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  14–180 дней
                </p>
              </div>
              <div>
                <Label className="text-xs">Горизонт прогноза (дней)</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={horizon}
                  onChange={(e) =>
                    setHorizon(
                      Math.max(1, Math.min(30, Number(e.target.value) || 1))
                    )
                  }
                  className="mt-1"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  1–30 дней
                </p>
              </div>
              <div>
                <Label className="text-xs">Топ товаров</Label>
                <Input
                  type="number"
                  min={3}
                  max={20}
                  value={topProducts}
                  onChange={(e) =>
                    setTopProducts(
                      Math.max(3, Math.min(20, Number(e.target.value) || 3))
                    )
                  }
                  className="mt-1"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  3–20 SKU
                </p>
              </div>
            </div>
            {data?.meta && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="secondary" className="bg-slate-100">
                  Алгоритм: {data.meta.algorithm}
                </Badge>
                <Badge variant="secondary" className="bg-slate-100">
                  Образец: {data.meta.sampleDays} дн / {data.meta.sampleOrders}{' '}
                  заказов
                </Badge>
                <Badge variant="secondary" className="bg-slate-100">
                  Сгенерировано:{' '}
                  {new Date(data.meta.generatedAt).toLocaleString('ru-RU')}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {loading || !data ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiTile
                label={`Прогноз выручки (${horizon} дн)`}
                value={formatCurrency(data.totals.revenue, 'UZS')}
                icon={<TrendingUp className="h-4 w-4" />}
                tone="emerald"
                hint="Сумма по горизонту"
              />
              <KpiTile
                label="Прогноз заказов"
                value={String(data.totals.orders)}
                icon={<ChartLine className="h-4 w-4" />}
                tone="cyan"
                hint="Кол-во чеков"
              />
              <KpiTile
                label="Средний чек"
                value={formatCurrency(data.totals.avgTicket, 'UZS')}
                icon={<BarChart3 className="h-4 w-4" />}
                tone="amber"
                hint="Прогноз"
              />
              <KpiTile
                label="Пиковый день"
                value={
                  peakDay
                    ? `${DOW_LABELS[peakDay.dow]} (${peakDay.date.slice(5)})`
                    : '—'
                }
                icon={<Calendar className="h-4 w-4" />}
                tone="violet"
                hint={
                  peakDay ? formatCurrency(peakDay.revenue, 'UZS') : 'нет данных'
                }
              />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Дневной прогноз ({data.forecast.length} дн)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Дата</th>
                        <th className="px-3 py-2 text-left">День</th>
                        <th className="px-3 py-2 text-right">Выручка</th>
                        <th className="px-3 py-2 text-right">Заказы</th>
                        <th className="px-3 py-2 text-right">Ср. чек</th>
                        <th className="px-3 py-2 text-left">
                          Уверенность
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.forecast.map((f) => {
                        const conf = Math.round(f.confidence * 100)
                        const tone =
                          conf >= 80
                            ? 'bg-emerald-100 text-emerald-800'
                            : conf >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                        return (
                          <tr key={f.date} className="hover:bg-accent/30">
                            <td className="px-3 py-2 font-mono text-xs">
                              {f.date}
                            </td>
                            <td className="px-3 py-2">
                              {DOW_LABELS[f.dow]}
                            </td>
                            <td className="px-3 py-2 text-right font-bold tabular-nums">
                              {formatCurrency(f.revenue, 'UZS')}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {f.orders}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatCurrency(f.avgTicket, 'UZS')}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      'absolute inset-y-0 left-0 rounded-full',
                                      conf >= 80
                                        ? 'bg-emerald-500'
                                        : conf >= 50
                                          ? 'bg-amber-500'
                                          : 'bg-rose-500'
                                    )}
                                    style={{ width: `${conf}%` }}
                                  />
                                </div>
                                <Badge
                                  variant="secondary"
                                  className={cn('text-[10px]', tone)}
                                >
                                  {conf}%
                                </Badge>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  Топ товаров на следующие {horizon} дн
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.products.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Недостаточно данных для прогноза по товарам.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.products.map((p, idx) => {
                      const max = Math.max(
                        ...data.products.map((x) => x.nextWeek),
                        1
                      )
                      const pct = Math.round((p.nextWeek / max) * 100)
                      return (
                        <li
                          key={`${p.productId ?? p.name}-${idx}`}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-accent/30"
                        >
                          <div className="grid h-8 w-8 place-items-center rounded-md bg-amber-50 text-amber-800">
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {p.name}
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-amber-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold tabular-nums">
                              {p.nextWeek}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              ~{p.avgPerDay}/день
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
