'use client'
/**
 * /pos/delivery/map — live courier map.
 *
 * Polls /api/admin/couriers every 15s and plots couriers with valid
 * latitude/longitude on a Leaflet map. New UI counterpart of the legacy
 * MiddleLiveMap / DispatchMapPanel — old views remain at /middle-admin?tab=orders.
 */
import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, RefreshCw, Truck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { usePolling } from '@/hooks/usePolling'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import type { CourierPin } from './CourierMap'

// Leaflet must run client-side only — `window` access at module eval.
const CourierMap = dynamic(() => import('./CourierMap'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center rounded-xl bg-muted/40 text-sm text-muted-foreground">
      Загрузка карты…
    </div>
  ),
})

type CourierRow = {
  id: string
  name: string
  email?: string
  isActive: boolean
  latitude?: number | null
  longitude?: number | null
  averageDeliveryMinutes?: number | null
  activeOrdersCount?: number
  isOnShift?: boolean
}

export default function DeliveryMapPage() {
  const { data, refresh, loading } = usePolling<CourierRow[]>(
    '/api/admin/couriers',
    15000
  )

  const all = useMemo<CourierRow[]>(() => (Array.isArray(data) ? data : []), [data])
  const withCoords: CourierPin[] = useMemo(
    () =>
      all
        .filter(
          (c): c is CourierRow & { latitude: number; longitude: number } =>
            typeof c.latitude === 'number' && typeof c.longitude === 'number'
        )
        .map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          lat: c.latitude,
          lng: c.longitude,
          isOnShift: c.isOnShift,
          averageDeliveryMinutes: c.averageDeliveryMinutes,
          activeOrdersCount: c.activeOrdersCount,
        })),
    [all]
  )

  const noCoords = all.length - withCoords.length
  const onShift = all.filter((c) => c.isOnShift).length

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <PosPageHeader
        title="Live-карта курьеров"
        icon={<MapPin className="h-4 w-4 text-indigo-500" />}
        backHref="/pos/delivery"
        badge={`${withCoords.length} / ${all.length}`}
        actions={
          <>
            <span className="text-[11px] text-muted-foreground">Обновление каждые 15 сек</span>
            <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn('mr-1 h-3.5 w-3.5', loading && 'animate-spin')} />
              Обновить
            </Button>
          </>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[1fr_320px]">
        {/* Map */}
        <div className="relative min-h-[420px] overflow-hidden rounded-xl border border-border bg-card">
          <CourierMap pins={withCoords} />
          {withCoords.length === 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
              <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                <MapPin className="mx-auto mb-2 h-8 w-8 opacity-50" />
                Нет курьеров с координатами.
                <div className="mt-1 text-[11px]">
                  Когда курьеры начнут отправлять локацию, они появятся здесь автоматически.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <Card className="flex flex-col">
          <CardContent className="space-y-3 p-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat icon={<Users className="h-3 w-3" />} label="Всего" value={all.length} tone="neutral" />
              <Stat
                icon={<Truck className="h-3 w-3" />}
                label="На смене"
                value={onShift}
                tone={onShift > 0 ? 'emerald' : 'neutral'}
              />
              <Stat
                icon={<MapPin className="h-3 w-3" />}
                label="Без коорд."
                value={noCoords}
                tone={noCoords > 0 ? 'amber' : 'neutral'}
              />
            </div>

            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Курьеры
            </h2>

            <ul className="space-y-1.5">
              {all.length === 0 ? (
                <li className="py-6 text-center text-xs text-muted-foreground">
                  Нет данных
                </li>
              ) : (
                all
                  .sort((a, b) => Number(!!b.isOnShift) - Number(!!a.isOnShift))
                  .map((c) => {
                    const hasCoords = typeof c.latitude === 'number' && typeof c.longitude === 'number'
                    return (
                      <li
                        key={c.id}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-md border border-border p-2 text-xs',
                          c.isOnShift && 'bg-emerald-50/40'
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-foreground">
                            {c.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className={cn('h-1.5 w-1.5 rounded-full', c.isOnShift ? 'bg-emerald-500' : 'bg-slate-400')} />
                            {c.isOnShift ? 'На смене' : 'Свободен'}
                            {!hasCoords && ' · нет GPS'}
                          </div>
                        </div>
                        {typeof c.activeOrdersCount === 'number' && c.activeOrdersCount > 0 && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            {c.activeOrdersCount}
                          </Badge>
                        )}
                      </li>
                    )
                  })
              )}
            </ul>

            <div className="rounded-md border border-dashed border-border bg-muted/30 p-2 text-[10px] text-muted-foreground">
              Полная диспетчерская панель (с маршрутами и оптимизацией) доступна в старой админке:{' '}
              <a
                href="/middle-admin?tab=orders"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                /middle-admin?tab=orders
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: 'emerald' | 'amber' | 'neutral'
}) {
  const cls = {
    emerald: 'border-emerald-200 bg-emerald-50/60 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50/60 text-amber-900',
    neutral: 'border-border bg-card text-foreground',
  }[tone]
  return (
    <div className={cn('rounded-lg border p-2 text-center', cls)}>
      <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-base font-bold tabular-nums">{value}</div>
    </div>
  )
}
