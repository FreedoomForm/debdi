'use client'

/**
 * /pos/auto-orders — Auto-orders command center.
 *
 * Surfaces three legacy admin endpoints:
 *   GET  /api/admin/auto-orders/create?date=YYYY-MM-DD  → today stats + tomorrow preview
 *   POST /api/admin/auto-orders/create                  → batch create next 30 days
 *   GET  /api/admin/auto-orders/schedule                → 30-day client status snapshot
 *
 * UI:
 *   - KPI strip (today created, tomorrow eligible, active clients, upcoming orders)
 *   - Tabs: «Сегодня», «Завтра», «Расписание клиентов»
 *   - One-click «Создать заказы на 30 дней» with confirmation
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  CalendarDays,
  Repeat,
  Sparkles,
  Users,
  TrendingUp,
  ArrowRight,
  Phone,
  MapPin,
  Loader2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { cn } from '@/lib/utils'

type TodayOrder = {
  id: string
  customerName?: string | null
  customerPhone?: string | null
  deliveryAddress?: string | null
  deliveryDate?: string | null
  deliveryTime?: string | null
  isAutoOrder?: boolean
}

type EligibleClient = {
  id: string
  name: string
  phone?: string | null
  orderPattern?: string | null
}

type TodayStats = {
  todayStats: {
    date: string
    autoOrdersCreated: number
    orders: TodayOrder[]
  }
  tomorrowPreview: {
    date: string
    eligibleClients: number
    clients: EligibleClient[]
  }
}

type ClientStatus = {
  clientId: string
  clientName: string
  autoOrdersEnabled: boolean
  isActive: boolean
  upcomingOrders: number
  nextDeliveryDate: string | null
  deliveryDays: Record<string, boolean>
}

type ScheduleSnapshot = {
  status: string
  totalActiveClients: number
  clients: ClientStatus[]
  summary: { totalUpcomingOrders: number }
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Пн',
  tuesday: 'Вт',
  wednesday: 'Ср',
  thursday: 'Чт',
  friday: 'Пт',
  saturday: 'Сб',
  sunday: 'Вс',
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    })
  } catch {
    return iso
  }
}

export default function AutoOrdersPage() {
  const [today, setToday] = useState<TodayStats | null>(null)
  const [schedule, setSchedule] = useState<ScheduleSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [todayRes, scheduleRes] = await Promise.all([
        fetch('/api/admin/auto-orders/create', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/admin/auto-orders/schedule', { credentials: 'include', cache: 'no-store' }),
      ])
      if (todayRes.ok) setToday(await todayRes.json())
      if (scheduleRes.ok) setSchedule(await scheduleRes.json())
      if (!todayRes.ok && !scheduleRes.ok) {
        toast.error('Не удалось загрузить данные авто-заказов')
      }
    } catch (err) {
      console.error(err)
      toast.error('Сбой сети при загрузке авто-заказов')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const runBatch = useCallback(async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/auto-orders/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка создания')
      toast.success(data.message || `Создано ${data.createdCount ?? 0} заказов`)
      setConfirmOpen(false)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Не удалось создать авто-заказы')
    } finally {
      setCreating(false)
    }
  }, [load])

  const kpi = useMemo(() => {
    return {
      todayCount: today?.todayStats.autoOrdersCreated ?? 0,
      tomorrowEligible: today?.tomorrowPreview.eligibleClients ?? 0,
      activeClients: schedule?.totalActiveClients ?? 0,
      upcoming: schedule?.summary.totalUpcomingOrders ?? 0,
    }
  }, [today, schedule])

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PosPageHeader
        title="Авто-заказы"
        description="Расписание автозаказов клиентов на 30 дней вперёд"
        icon={Repeat}
        backHref="/pos/terminal"
        actions={
          <div className="flex items-center gap-2">
            <RefreshButton onClick={load} loading={loading} />
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={loading || kpi.activeClients === 0}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Создать на 30 дней
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          label="Создано сегодня"
          value={kpi.todayCount}
          icon={CalendarDays}
          tone="emerald"
        />
        <KpiTile
          label="Готовы на завтра"
          value={kpi.tomorrowEligible}
          icon={ArrowRight}
          tone="sky"
        />
        <KpiTile
          label="Активные клиенты"
          value={kpi.activeClients}
          icon={Users}
          tone="violet"
        />
        <KpiTile
          label="Предстоит (30 дн)"
          value={kpi.upcoming}
          icon={TrendingUp}
          tone="amber"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Загрузка авто-заказов…
        </div>
      ) : (
        <Tabs defaultValue="today" className="w-full">
          <TabsList>
            <TabsTrigger value="today">
              Сегодня ({kpi.todayCount})
            </TabsTrigger>
            <TabsTrigger value="tomorrow">
              Завтра ({kpi.tomorrowEligible})
            </TabsTrigger>
            <TabsTrigger value="schedule">
              Расписание ({kpi.activeClients})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-4">
            {today && today.todayStats.orders.length > 0 ? (
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Клиент</th>
                      <th className="px-4 py-2 text-left">Адрес</th>
                      <th className="px-4 py-2 text-left">Время</th>
                      <th className="px-4 py-2 text-left">Тип</th>
                    </tr>
                  </thead>
                  <tbody>
                    {today.todayStats.orders.map(o => (
                      <tr key={o.id} className="border-t">
                        <td className="px-4 py-2">
                          <div className="font-medium">{o.customerName ?? '—'}</div>
                          {o.customerPhone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {o.customerPhone}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          <div className="flex items-start gap-1">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="line-clamp-2">{o.deliveryAddress ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">
                          {o.deliveryTime ?? '—'}
                        </td>
                        <td className="px-4 py-2">
                          <Badge
                            variant={o.isAutoOrder ? 'default' : 'secondary'}
                            className={cn(
                              o.isAutoOrder && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                            )}
                          >
                            {o.isAutoOrder ? 'Авто' : 'Ручной'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                Сегодня заказов пока нет
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tomorrow" className="mt-4">
            {today && today.tomorrowPreview.clients.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {today.tomorrowPreview.clients.map(c => (
                  <Card key={c.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{c.name}</div>
                        {c.phone && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {c.orderPattern ?? 'Ежедневно'}
                      </Badge>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Будет создан завтра — {fmtDate(today.tomorrowPreview.date)}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                Нет клиентов, подходящих на завтра
              </Card>
            )}
          </TabsContent>

          <TabsContent value="schedule" className="mt-4">
            {schedule && schedule.clients.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {schedule.clients.map(c => (
                  <Card key={c.clientId} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/pos/clients?focus=${c.clientId}`}
                          className="font-semibold hover:underline"
                        >
                          {c.clientName}
                        </Link>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Следующая доставка: {fmtDate(c.nextDeliveryDate)}
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          'text-xs',
                          c.upcomingOrders > 0
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {c.upcomingOrders} зак.
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {Object.entries(DAY_LABELS).map(([key, label]) => {
                        const active = !!c.deliveryDays?.[key]
                        return (
                          <span
                            key={key}
                            className={cn(
                              'rounded px-2 py-0.5 text-xs font-medium',
                              active
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground/60',
                            )}
                          >
                            {label}
                          </span>
                        )
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                Нет активных клиентов с авто-заказами
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать авто-заказы на 30 дней?</DialogTitle>
            <DialogDescription>
              Будут созданы заказы для всех клиентов с включёнными авто-заказами на ближайшие 30 дней
              согласно их расписанию доставки. Существующие заказы не дублируются.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div>Активных клиентов: <strong>{kpi.activeClients}</strong></div>
            <div>Ожидаемо к созданию: ~<strong>{kpi.upcoming}</strong> заказов</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={creating}>
              Отмена
            </Button>
            <Button onClick={runBatch} disabled={creating} className="gap-2">
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Создать заказы
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
