'use client'
/**
 * /pos/live — real-time operational snapshot.
 *
 * Surfaces /api/pos/dashboard/live (open orders, low-stock, current shift,
 * unread notifications, today revenue/orders) with auto-refresh every 5s.
 * Designed as a wall-mounted dashboard for managers.
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Bell,
  Boxes,
  Clock,
  Loader2,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { formatCurrency } from '@/lib/pos'

type LiveData = {
  openOrders: number
  lowStock: number
  openShift?: {
    id: string
    openedAt: string
    totalSales: number
    ordersCount: number
  } | null
  unreadNotifs: number
  today: { revenue: number; orders: number }
}

const REFRESH_MS = 5000

export default function LivePage() {
  const [data, setData] = useState<LiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/dashboard/live', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as LiveData
      setData(json)
      setUpdatedAt(new Date())
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Лайв-статус"
        icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
        backHref="/pos/dashboard"
        badge={`автообновление ${REFRESH_MS / 1000}s`}
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        {loading && !data ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiTile
                label="Сегодня выручка"
                value={formatCurrency(data.today.revenue, 'UZS')}
                icon={<Wallet className="h-4 w-4" />}
                tone="emerald"
                hint={`${data.today.orders} заказов`}
              />
              <KpiTile
                label="Открытые заказы"
                value={String(data.openOrders)}
                icon={<ShoppingCart className="h-4 w-4" />}
                tone={data.openOrders > 0 ? 'amber' : 'neutral'}
                hint="NEW / PENDING / IN_PROCESS"
              />
              <KpiTile
                label="Мало остатка"
                value={String(data.lowStock)}
                icon={<AlertTriangle className="h-4 w-4" />}
                tone={data.lowStock > 0 ? 'rose' : 'emerald'}
                hint="≤ reorderLevel"
              />
              <KpiTile
                label="Уведомления"
                value={String(data.unreadNotifs)}
                icon={<Bell className="h-4 w-4" />}
                tone={data.unreadNotifs > 0 ? 'cyan' : 'neutral'}
                hint="Непрочитанные"
              />
            </div>

            <Card>
              <CardContent className="space-y-3 p-4">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Текущая смена
                </h2>
                {data.openShift ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md border border-emerald-200 bg-emerald-50/40 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Открыта
                      </div>
                      <div className="mt-1 text-sm font-semibold tabular-nums">
                        {new Date(data.openShift.openedAt).toLocaleString('ru-RU')}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-card p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Чеков
                      </div>
                      <div className="mt-1 text-2xl font-bold tabular-nums">
                        {data.openShift.ordersCount}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-card p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Выручка по смене
                      </div>
                      <div className="mt-1 text-2xl font-bold tabular-nums">
                        {formatCurrency(data.openShift.totalSales, 'UZS')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Смена закрыта.{' '}
                    <Link
                      href="/pos/shift"
                      className="font-medium text-primary hover:underline"
                    >
                      Открыть смену →
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Card className="hover:shadow-md transition">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShoppingCart className="h-4 w-4 text-amber-500" />
                    Активные заказы
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data.openOrders} заказов в работе.
                  </p>
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href="/pos/orders">Перейти →</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    Низкий остаток
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data.lowStock} SKU достигли минимума.
                  </p>
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href="/pos/inventory">Открыть склад →</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Bell className="h-4 w-4 text-cyan-500" />
                    Уведомления
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data.unreadNotifs} непрочитанных.
                  </p>
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href="/pos/notifications">Открыть инбокс →</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {updatedAt && (
              <p className="text-right text-[10px] text-muted-foreground">
                Обновлено: {updatedAt.toLocaleTimeString('ru-RU')}
              </p>
            )}
          </>
        ) : null}
      </main>
    </div>
  )
}
