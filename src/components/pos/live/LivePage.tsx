'use client'
/**
 * /pos/live — real-time operational dashboard.
 *
 * Surfaces /api/pos/dashboard/live (GET) plus a concurrent fetch of recent
 * orders, KDS items and notifications so managers see a single "right now"
 * heads-up display. Auto-refreshes every 10 seconds.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Activity,
  AlertTriangle,
  Bell,
  ChefHat,
  CircleDot,
  Clock,
  Loader2,
  Package,
  ReceiptText,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { formatCurrency } from '@/lib/pos'

type LiveSnapshot = {
  openOrders: number
  lowStock: number
  openShift: {
    id: string
    openedAt: string
    totalSales: number
    ordersCount: number
  } | null
  unreadNotifs: number
  today: {
    revenue: number
    orders: number
  }
}

type Order = {
  id: string
  orderNumber: number
  orderStatus: string
  grandTotal?: number | null
  createdAt: string
  customer?: { id: string; name: string; phone: string } | null
}

type KdsTicket = {
  id: string
  orderNumber: number
  orderStatus: string
  serviceMode?: string | null
  createdAt: string
  items: Array<{ id: string; name: string; quantity: number }>
}

type Notif = {
  id: string
  type: string
  title: string
  body?: string | null
  isRead: boolean
  createdAt: string
}

const ORDER_STATUS_TONES: Record<string, string> = {
  NEW: 'bg-amber-100 text-amber-800',
  PENDING: 'bg-amber-100 text-amber-800',
  IN_PROCESS: 'bg-blue-100 text-blue-800',
  READY: 'bg-emerald-100 text-emerald-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELED: 'bg-rose-100 text-rose-800',
  PAID: 'bg-emerald-100 text-emerald-800',
}

function relTime(value: string): string {
  const ms = Date.now() - new Date(value).getTime()
  if (Number.isNaN(ms)) return '—'
  if (ms < 60_000) return 'только что'
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `${min} мин`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} ч`
  const day = Math.floor(hr / 24)
  return `${day} дн`
}

export default function LivePage() {
  const [snap, setSnap] = useState<LiveSnapshot | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [kds, setKds] = useState<KdsTicket[]>([])
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const load = useCallback(async () => {
    try {
      const [liveRes, ordRes, kdsRes, notifRes] = await Promise.all([
        fetch('/api/pos/dashboard/live', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/pos/orders?limit=20', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/pos/kds', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/pos/notifications?unread=1', {
          credentials: 'include',
          cache: 'no-store',
        }),
      ])
      if (liveRes.ok) setSnap((await liveRes.json()) as LiveSnapshot)
      if (ordRes.ok) {
        const od = (await ordRes.json()) as { items?: Order[] }
        setOrders(od.items ?? [])
      }
      if (kdsRes.ok) {
        const kd = (await kdsRes.json()) as { items?: KdsTicket[] }
        setKds(kd.items ?? [])
      }
      if (notifRes.ok) {
        const nd = (await notifRes.json()) as { items?: Notif[] }
        setNotifs(nd.items ?? [])
      }
    } catch (err) {
      // Silent fail on auto-refresh; only surface first-load errors.
      if (loading) {
        toast.error(
          err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить'
        )
      }
    } finally {
      setLoading(false)
    }
  }, [loading])

  useEffect(() => {
    load()
    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 10_000)
    return () => clearInterval(interval)
  }, [load])

  // Reload whenever the tick changes (keeps load() out of the interval body).
  useEffect(() => {
    if (tick === 0) return
    load()
  }, [tick, load])

  const openTickets = useMemo(
    () =>
      kds.filter(
        (k) => k.orderStatus === 'NEW' || k.orderStatus === 'IN_PROCESS'
      ),
    [kds]
  )

  const shiftDuration = useMemo(() => {
    if (!snap?.openShift) return null
    const ms = Date.now() - new Date(snap.openShift.openedAt).getTime()
    const min = Math.floor(ms / 60_000)
    const h = Math.floor(min / 60)
    const m = min % 60
    return h > 0 ? `${h} ч ${m} мин` : `${m} мин`
  }, [snap?.openShift])

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Live · Сейчас"
        icon={<Activity className="h-4 w-4 text-emerald-500" />}
        backHref="/pos/dashboard"
        badge={
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            обновляется каждые 10 с
          </span>
        }
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        {loading && !snap ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiTile
                label="Выручка сегодня"
                value={formatCurrency(snap?.today.revenue ?? 0, 'UZS')}
                icon={<TrendingUp className="h-4 w-4" />}
                tone="emerald"
                hint={`${snap?.today.orders ?? 0} заказов`}
              />
              <KpiTile
                label="Открытых заказов"
                value={String(snap?.openOrders ?? 0)}
                icon={<ReceiptText className="h-4 w-4" />}
                tone={
                  (snap?.openOrders ?? 0) > 0 ? 'amber' : 'neutral'
                }
                hint="NEW / PENDING / IN_PROCESS"
              />
              <KpiTile
                label="Низкий остаток"
                value={String(snap?.lowStock ?? 0)}
                icon={<AlertTriangle className="h-4 w-4" />}
                tone={(snap?.lowStock ?? 0) > 0 ? 'rose' : 'emerald'}
                hint="Товары ≤ 10 ед."
              />
              <KpiTile
                label="Уведомлений"
                value={String(snap?.unreadNotifs ?? 0)}
                icon={<Bell className="h-4 w-4" />}
                tone={(snap?.unreadNotifs ?? 0) > 0 ? 'amber' : 'neutral'}
                hint="Непрочитанные"
              />
            </div>

            {snap?.openShift && (
              <Card className="border-emerald-200 bg-emerald-50/30">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      Активная смена
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        ● Открыта {shiftDuration}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Открыта в{' '}
                        {new Date(snap.openShift.openedAt).toLocaleTimeString(
                          'ru-RU'
                        )}
                      </span>
                      <span>·</span>
                      <span>{snap.openShift.ordersCount} заказов</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">
                        Выручка: {formatCurrency(snap.openShift.totalSales, 'UZS')}
                      </span>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/pos/shift">
                      <Clock className="mr-1.5 h-3.5 w-3.5" />К смене
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <ReceiptText className="h-4 w-4" />
                      Последние заказы
                    </span>
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/pos/orders">Все →</Link>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {orders.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                      Нет заказов за последний период.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {orders.slice(0, 12).map((o) => {
                        const tone =
                          ORDER_STATUS_TONES[o.orderStatus] ??
                          'bg-slate-100 text-slate-800'
                        return (
                          <li
                            key={o.id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-accent/30"
                          >
                            <div className="grid h-8 w-8 place-items-center rounded-md bg-muted text-xs font-bold tabular-nums">
                              #{o.orderNumber}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className={cn('text-[10px]', tone)}
                                >
                                  {o.orderStatus}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {relTime(o.createdAt)}
                                </span>
                              </div>
                              {o.customer && (
                                <div className="mt-0.5 truncate text-xs">
                                  {o.customer.name}
                                </div>
                              )}
                            </div>
                            {o.grandTotal != null && (
                              <div className="shrink-0 text-sm font-bold tabular-nums">
                                {formatCurrency(o.grandTotal, 'UZS')}
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <ChefHat className="h-4 w-4" />
                      Кухня сейчас ({openTickets.length})
                    </span>
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/pos/kds">KDS →</Link>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {openTickets.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                      Нет активных тикетов на кухне.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {openTickets.slice(0, 12).map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center gap-3 px-3 py-2"
                        >
                          <div className="grid h-8 w-8 place-items-center rounded-md bg-amber-100 text-xs font-bold tabular-nums text-amber-900">
                            #{t.orderNumber}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-[10px]',
                                  ORDER_STATUS_TONES[t.orderStatus] ??
                                    'bg-slate-100 text-slate-800'
                                )}
                              >
                                {t.orderStatus}
                              </Badge>
                              <span>{relTime(t.createdAt)}</span>
                              {t.serviceMode && <span>· {t.serviceMode}</span>}
                            </div>
                            <div className="mt-0.5 truncate text-xs">
                              {t.items
                                .slice(0, 4)
                                .map((it) => `${it.quantity}× ${it.name}`)
                                .join(' · ')}
                              {t.items.length > 4 &&
                                ` + ещё ${t.items.length - 4}`}
                            </div>
                          </div>
                          <CircleDot
                            className={cn(
                              'h-4 w-4',
                              t.orderStatus === 'IN_PROCESS'
                                ? 'animate-pulse text-blue-500'
                                : 'text-amber-500'
                            )}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Непрочитанные уведомления ({notifs.length})
                  </span>
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/pos/notifications">Все →</Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {notifs.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                    Все уведомления прочитаны 🎉
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {notifs.slice(0, 8).map((n) => (
                      <li
                        key={n.id}
                        className="flex items-start gap-3 px-3 py-2"
                      >
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{n.title}</div>
                          {n.body && (
                            <div className="line-clamp-2 text-xs text-muted-foreground">
                              {n.body}
                            </div>
                          )}
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {relTime(n.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {(snap?.lowStock ?? 0) > 0 && (
              <Card className="border-rose-200 bg-rose-50/30">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-rose-100 text-rose-700">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      Низкий остаток: {snap?.lowStock} товаров
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Перейдите в /pos/products → отфильтруйте по «Низкий
                      остаток» и проведите закупку.
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/pos/products">Открыть товары</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
