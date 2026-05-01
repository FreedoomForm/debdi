'use client'
/**
 * /pos/cooking-plan — daily cooking plan dashboard.
 *
 * Surfaces /api/admin/warehouse/cooking-plan (GET single-day + GET range)
 * which previously had no dedicated UI in the new POS shell. Lets the
 * kitchen manager:
 *   - pick a date and see the planned dish quantities for that day
 *   - see cooked-vs-planned aggregate progress for any range
 *   - quickly switch between today / tomorrow / week
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CalendarDays,
  ChefHat,
  CheckCircle2,
  Clock,
  Flame,
  Loader2,
  Utensils,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'

type DayPlan = {
  date: string
  menuNumber: number
  dishes: Record<string, number>
  cookedStats: Record<string, Record<string, number>>
}

type SingleDayResponse = {
  dishes?: Record<string, number>
  cookedStats?: Record<string, Record<string, number>>
}

function todayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function plusDaysIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function sumValues(obj: Record<string, number> | undefined): number {
  if (!obj) return 0
  return Object.values(obj).reduce((s, n) => s + (typeof n === 'number' ? n : 0), 0)
}

function sumNestedValues(obj: Record<string, Record<string, number>> | undefined): number {
  if (!obj) return 0
  let total = 0
  for (const inner of Object.values(obj)) {
    if (inner && typeof inner === 'object') {
      for (const v of Object.values(inner)) {
        if (typeof v === 'number') total += v
      }
    }
  }
  return total
}

export default function CookingPlanPage() {
  const [date, setDate] = useState(todayIso())
  const [single, setSingle] = useState<SingleDayResponse | null>(null)
  const [range, setRange] = useState<DayPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [rangeFrom, setRangeFrom] = useState(plusDaysIso(-6))
  const [rangeTo, setRangeTo] = useState(todayIso())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [singleRes, rangeRes] = await Promise.all([
        fetch(`/api/admin/warehouse/cooking-plan?date=${date}`, {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch(
          `/api/admin/warehouse/cooking-plan?from=${rangeFrom}&to=${rangeTo}`,
          { credentials: 'include', cache: 'no-store' }
        ),
      ])
      if (singleRes.ok) {
        const data = (await singleRes.json()) as SingleDayResponse
        setSingle(data)
      }
      if (rangeRes.ok) {
        const data = await rangeRes.json()
        setRange(Array.isArray(data?.plans) ? data.plans : [])
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить'
      )
    } finally {
      setLoading(false)
    }
  }, [date, rangeFrom, rangeTo])

  useEffect(() => {
    load()
  }, [load])

  const dayStats = useMemo(() => {
    const planned = sumValues(single?.dishes)
    const cooked = sumNestedValues(single?.cookedStats)
    return {
      planned,
      cooked,
      remaining: Math.max(0, planned - cooked),
      progress: planned > 0 ? Math.min(100, Math.round((cooked / planned) * 100)) : 0,
      uniqueDishes: Object.keys(single?.dishes ?? {}).length,
    }
  }, [single])

  const rangeStats = useMemo(() => {
    let planned = 0
    let cooked = 0
    for (const p of range) {
      planned += sumValues(p.dishes)
      cooked += sumNestedValues(p.cookedStats)
    }
    return {
      planned,
      cooked,
      days: range.length,
      progress: planned > 0 ? Math.min(100, Math.round((cooked / planned) * 100)) : 0,
    }
  }, [range])

  const dishRows = useMemo(() => {
    if (!single?.dishes) return []
    return Object.entries(single.dishes)
      .map(([dishId, qty]) => {
        const cookedByCalorie = single.cookedStats?.[dishId] ?? {}
        const cooked = Object.values(cookedByCalorie).reduce(
          (s, v) => s + (typeof v === 'number' ? v : 0),
          0
        )
        return {
          dishId,
          planned: qty,
          cooked,
          remaining: Math.max(0, qty - cooked),
        }
      })
      .sort((a, b) => b.planned - a.planned)
  }, [single])

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="План готовки"
        icon={<ChefHat className="h-4 w-4 text-rose-500" />}
        backHref="/pos/warehouse"
        badge={dayStats.planned ? `${dayStats.cooked}/${dayStats.planned}` : undefined}
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 p-3">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">Дата</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: 'yesterday', label: 'Вчера', delta: -1 },
                  { id: 'today', label: 'Сегодня', delta: 0 },
                  { id: 'tomorrow', label: 'Завтра', delta: 1 },
                  { id: 'plus7', label: '+7 дн', delta: 7 },
                ] as const
              ).map((b) => (
                <Button
                  key={b.id}
                  type="button"
                  size="sm"
                  variant={date === plusDaysIso(b.delta) ? 'default' : 'outline'}
                  onClick={() => setDate(plusDaysIso(b.delta))}
                >
                  {b.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            label="Запланировано"
            value={String(dayStats.planned)}
            icon={<CalendarDays className="h-4 w-4" />}
            tone="amber"
            hint={`Блюд: ${dayStats.uniqueDishes}`}
          />
          <KpiTile
            label="Приготовлено"
            value={String(dayStats.cooked)}
            icon={<CheckCircle2 className="h-4 w-4" />}
            tone={dayStats.cooked > 0 ? 'emerald' : 'neutral'}
            hint={`${dayStats.progress}% от плана`}
          />
          <KpiTile
            label="Осталось"
            value={String(dayStats.remaining)}
            icon={<Clock className="h-4 w-4" />}
            tone={dayStats.remaining > 0 ? 'rose' : 'emerald'}
            hint={dayStats.remaining > 0 ? 'К исполнению' : 'Готово'}
          />
          <KpiTile
            label="Прогресс"
            value={`${dayStats.progress}%`}
            icon={<Flame className="h-4 w-4" />}
            tone={
              dayStats.progress >= 100
                ? 'emerald'
                : dayStats.progress >= 50
                  ? 'amber'
                  : 'rose'
            }
            hint="cooked / planned"
          />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Блюда на {new Date(date).toLocaleDateString('ru-RU')} ({dishRows.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="grid place-items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : dishRows.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                На эту дату плана нет.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Блюдо</TableHead>
                    <TableHead className="text-right">План</TableHead>
                    <TableHead className="text-right">Приготовлено</TableHead>
                    <TableHead className="text-right">Осталось</TableHead>
                    <TableHead className="w-[200px]">Прогресс</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dishRows.map((r) => {
                    const pct =
                      r.planned > 0
                        ? Math.min(100, Math.round((r.cooked / r.planned) * 100))
                        : 0
                    return (
                      <TableRow key={r.dishId}>
                        <TableCell className="font-medium">
                          <Utensils className="mr-1 inline-block h-3.5 w-3.5 text-muted-foreground" />
                          {r.dishId}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.planned}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right tabular-nums',
                            r.cooked > 0 && 'text-emerald-700 font-semibold'
                          )}
                        >
                          {r.cooked}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right tabular-nums',
                            r.remaining > 0 && 'text-rose-700 font-semibold'
                          )}
                        >
                          {r.remaining}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  'absolute inset-y-0 left-0 rounded-full',
                                  pct >= 100
                                    ? 'bg-emerald-500'
                                    : pct >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[10px]',
                                pct >= 100
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : pct >= 50
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                              )}
                            >
                              {pct}%
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              Аудит периода
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">С</Label>
                <Input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">По</Label>
                <Input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md border border-border bg-card p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Дней
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums">
                  {rangeStats.days}
                </div>
              </div>
              <div className="rounded-md border border-border bg-card p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Запланировано
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums">
                  {rangeStats.planned}
                </div>
              </div>
              <div className="rounded-md border border-border bg-card p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Приготовлено
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
                  {rangeStats.cooked}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Итого по периоду</span>
                <span className="font-bold tabular-nums">
                  {rangeStats.progress}%
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full',
                    rangeStats.progress >= 100
                      ? 'bg-emerald-500'
                      : rangeStats.progress >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                  )}
                  style={{ width: `${rangeStats.progress}%` }}
                />
              </div>
            </div>

            {range.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead className="text-right">Меню №</TableHead>
                      <TableHead className="text-right">План</TableHead>
                      <TableHead className="text-right">Готово</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {range.map((p) => {
                      const planned = sumValues(p.dishes)
                      const cooked = sumNestedValues(p.cookedStats)
                      const pct =
                        planned > 0
                          ? Math.min(100, Math.round((cooked / planned) * 100))
                          : 0
                      return (
                        <TableRow key={p.date}>
                          <TableCell className="font-mono text-xs">
                            {p.date}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {p.menuNumber}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {planned}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {cooked}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[10px]',
                                pct >= 100
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : pct >= 50
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                              )}
                            >
                              {pct}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
