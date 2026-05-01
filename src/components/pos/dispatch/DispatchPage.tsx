'use client'

/**
 * /pos/dispatch — Dispatch operations console.
 *
 * Surfaces legacy admin dispatch endpoints in the modern POS shell:
 *   POST /api/admin/dispatch/start-day          → mark today's assigned orders PENDING
 *   POST /api/admin/dispatch/normalize-drafts   → revert future-day drafts to NEW
 *   GET  /api/admin/live-map                    → couriers / orders / warehouse points
 *
 * UI:
 *   - KPI strip (couriers online, orders today, pending, geocoded)
 *   - Dispatch actions card (Start day / Normalize drafts) with confirmations
 *   - Couriers + orders snapshot tables (read-only) with quick links
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Truck,
  PlayCircle,
  RotateCcw,
  Loader2,
  Users,
  Package,
  MapPin,
  Clock,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { cn } from '@/lib/utils'

type Courier = {
  id: string
  name: string
  lat: number
  lng: number
}

type LiveOrder = {
  id: string
  orderNumber: number
  customerName: string
  status: string
  deliveryTime: string
  courierId: string | null
  courierName: string | null
  lat: number
  lng: number
}

type LiveMapData = {
  couriers?: Courier[]
  clients?: { id: string; name: string; lat: number; lng: number }[]
  orders?: LiveOrder[]
  warehouse?: { lat: number; lng: number } | null
}

const STATUS_TONE: Record<string, string> = {
  NEW: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  IN_PROCESS: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  IN_DELIVERY: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  DELIVERED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  PAUSED: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  CANCELED: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
}

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Новый',
  PENDING: 'Готов к развозу',
  IN_PROCESS: 'В работе',
  IN_DELIVERY: 'В доставке',
  DELIVERED: 'Доставлен',
  PAUSED: 'Пауза',
  CANCELED: 'Отменён',
}

export default function DispatchPage() {
  const [data, setData] = useState<LiveMapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<null | 'start-day' | 'normalize'>(null)
  const [confirm, setConfirm] = useState<null | 'start-day' | 'normalize'>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/live-map', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        toast.error('Не удалось загрузить live-map')
      }
    } catch {
      toast.error('Сбой сети при загрузке диспетчера')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  const runStartDay = useCallback(async () => {
    setBusy('start-day')
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch('/api/admin/dispatch/start-day', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Ошибка')
      toast.success(`Запущено: ${json.updatedCount} заказов помечены PENDING`)
      setConfirm(null)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Не удалось запустить день')
    } finally {
      setBusy(null)
    }
  }, [load])

  const runNormalize = useCallback(async () => {
    setBusy('normalize')
    try {
      const res = await fetch('/api/admin/dispatch/normalize-drafts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Ошибка')
      toast.success(`Нормализовано: ${json.updatedCount} будущих заказов → NEW`)
      setConfirm(null)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Не удалось нормализовать')
    } finally {
      setBusy(null)
    }
  }, [load])

  const kpi = useMemo(() => {
    const orders = data?.orders ?? []
    const couriers = data?.couriers ?? []
    const pending = orders.filter(o => o.status === 'PENDING').length
    const inDelivery = orders.filter(o => o.status === 'IN_DELIVERY').length
    return {
      couriers: couriers.length,
      orders: orders.length,
      pending,
      inDelivery,
    }
  }, [data])

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PosPageHeader
        title="Диспетчер"
        description="Запуск дня, нормализация черновиков, обзор курьеров"
        icon={Truck}
        backHref="/pos/terminal"
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile label="Курьеры на карте" value={kpi.couriers} icon={Users} tone="violet" />
        <KpiTile label="Заказов сегодня" value={kpi.orders} icon={Package} tone="sky" />
        <KpiTile label="Готовы (PENDING)" value={kpi.pending} icon={Clock} tone="amber" />
        <KpiTile label="В доставке" value={kpi.inDelivery} icon={Truck} tone="emerald" />
      </div>

      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold text-muted-foreground">
          Быстрые действия диспетчера
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            onClick={() => setConfirm('start-day')}
            className="group flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
          >
            <PlayCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            <div className="flex-1">
              <div className="font-semibold">Запустить день</div>
              <div className="text-xs text-muted-foreground">
                Все назначенные заказы на сегодня → статус PENDING (готов к развозу)
              </div>
            </div>
          </button>
          <button
            onClick={() => setConfirm('normalize')}
            className="group flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-left transition hover:border-amber-400 hover:bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 dark:hover:bg-amber-950/40"
          >
            <RotateCcw className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <div className="font-semibold">Нормализовать черновики</div>
              <div className="text-xs text-muted-foreground">
                Будущие заказы со статусами PENDING / IN_DELIVERY / PAUSED → NEW
              </div>
            </div>
          </button>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Загрузка карты диспетчера…
        </div>
      ) : (
        <Tabs defaultValue="orders" className="w-full">
          <TabsList>
            <TabsTrigger value="orders">Заказы ({kpi.orders})</TabsTrigger>
            <TabsTrigger value="couriers">Курьеры ({kpi.couriers})</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4">
            {data?.orders && data.orders.length > 0 ? (
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">№</th>
                      <th className="px-4 py-2 text-left">Клиент</th>
                      <th className="px-4 py-2 text-left">Курьер</th>
                      <th className="px-4 py-2 text-left">Время</th>
                      <th className="px-4 py-2 text-left">Статус</th>
                      <th className="px-4 py-2 text-left">Координаты</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map(o => (
                      <tr key={o.id} className="border-t">
                        <td className="px-4 py-2 font-mono">#{o.orderNumber}</td>
                        <td className="px-4 py-2">
                          <Link
                            href={`/pos/orders?focus=${o.id}`}
                            className="font-medium hover:underline"
                          >
                            {o.customerName}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {o.courierName ?? '—'}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">
                          {o.deliveryTime ?? '—'}
                        </td>
                        <td className="px-4 py-2">
                          <Badge
                            className={cn(
                              'text-xs',
                              STATUS_TONE[o.status] ?? 'bg-muted text-muted-foreground',
                            )}
                          >
                            {STATUS_LABEL[o.status] ?? o.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {o.lat.toFixed(4)}, {o.lng.toFixed(4)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                Нет заказов с координатами на сегодня
              </Card>
            )}
          </TabsContent>

          <TabsContent value="couriers" className="mt-4">
            {data?.couriers && data.couriers.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.couriers.map(c => {
                  const ordersOfCourier = (data.orders ?? []).filter(
                    o => o.courierId === c.id,
                  )
                  return (
                    <Card key={c.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold">{c.name}</div>
                          <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
                          </div>
                        </div>
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          {ordersOfCourier.length} зак.
                        </Badge>
                      </div>
                      {ordersOfCourier.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {ordersOfCourier.slice(0, 4).map(o => (
                            <div
                              key={o.id}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="font-mono text-muted-foreground">
                                #{o.orderNumber}
                              </span>
                              <span className="truncate">{o.customerName}</span>
                              <Badge
                                className={cn(
                                  'text-[10px]',
                                  STATUS_TONE[o.status] ??
                                    'bg-muted text-muted-foreground',
                                )}
                              >
                                {STATUS_LABEL[o.status] ?? o.status}
                              </Badge>
                            </div>
                          ))}
                          {ordersOfCourier.length > 4 && (
                            <div className="text-xs text-muted-foreground">
                              +{ordersOfCourier.length - 4} ещё
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                Курьеры пока не на линии
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={confirm !== null} onOpenChange={open => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === 'start-day' && 'Запустить день?'}
              {confirm === 'normalize' && 'Нормализовать черновики?'}
            </DialogTitle>
            <DialogDescription>
              {confirm === 'start-day' &&
                'Все заказы на сегодня, у которых уже назначен курьер и статус NEW / IN_PROCESS, перейдут в статус PENDING (готов к развозу). Действие необратимо в один клик — отменяется только ручным изменением статуса.'}
              {confirm === 'normalize' &&
                'Все будущие заказы (после сегодня) со статусами PENDING / IN_DELIVERY / PAUSED будут возвращены в статус NEW. Используйте, если случайно нажали «Запустить день» с неверной датой.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirm(null)}
              disabled={busy !== null}
            >
              Отмена
            </Button>
            <Button
              onClick={confirm === 'start-day' ? runStartDay : runNormalize}
              disabled={busy !== null}
              className="gap-2"
            >
              {busy !== null && <Loader2 className="h-4 w-4 animate-spin" />}
              Подтвердить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
