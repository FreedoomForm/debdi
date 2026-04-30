'use client'
/**
 * Kitchen Display System (KDS).
 *
 * Shows tickets the kitchen needs to prepare. Auto-refreshes every 5s.
 * Cards turn amber after 8 minutes and red after 15 minutes to surface
 * delays. Cashiers/cooks click "Начать" to move a ticket to "in progress",
 * and "Готово" to bump it to "ready".
 *
 * Designed for landscape tablets / wall-mounted screens — high contrast,
 * large touch targets, no clutter.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ChefHat,
  Clock,
  Loader2,
  Play,
  RefreshCw,
  Bell,
  CheckCircle2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { formatTime, relativeTime } from '@/lib/pos'

type KdsItem = {
  id: string
  name: string
  quantity: number
  modifiers?: { name: string; priceDelta?: number }[] | null
  notes?: string | null
}

type KdsOrder = {
  id: string
  orderNumber: number
  orderStatus: string
  serviceMode?: string | null
  tableId?: string | null
  notes?: string | null
  createdAt: string
  customer?: { name?: string | null; phone?: string | null } | null
  items: KdsItem[]
}

const REFRESH_MS = 5000
const WARN_MIN = 8
const DANGER_MIN = 15

type StationKey = 'ALL' | 'HOT' | 'COLD' | 'BAR' | 'GRILL' | 'BAKERY' | 'UNROUTED'

const STATION_LABEL: Record<StationKey, string> = {
  ALL: 'Все станции',
  HOT: 'Горячий цех',
  COLD: 'Холодный цех',
  BAR: 'Бар',
  GRILL: 'Гриль',
  BAKERY: 'Пекарня',
  UNROUTED: 'Без станции',
}

export function KDSPage() {
  const [orders, setOrders] = useState<KdsOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [bumping, setBumping] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const [soundOn, setSoundOn] = useState(false)
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set())
  const [station, setStation] = useState<StationKey>('ALL')
  const [stationCounts, setStationCounts] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    try {
      const url = station === 'ALL' ? '/api/pos/kds' : `/api/pos/kds?station=${station}`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as {
        items?: KdsOrder[]
        stationCounts?: Record<string, number>
      }
      const items = data.items ?? []
      setStationCounts(data.stationCounts ?? {})
      // Detect new tickets and chime.
      setKnownIds((prev) => {
        const newIds = new Set(prev)
        let hasNew = false
        for (const o of items) {
          if (!prev.has(o.id)) {
            newIds.add(o.id)
            hasNew = true
          }
        }
        if (hasNew && soundOn) {
          chime()
        }
        return newIds
      })
      setOrders(items)
    } catch (err) {
      // Silent fail — auto-refresh will retry. Only show on first load.
      if (loading) {
        toast.error(
          err instanceof Error ? `Ошибка КДС: ${err.message}` : 'Ошибка КДС'
        )
      }
    } finally {
      setLoading(false)
    }
  }, [loading, soundOn, station])

  useEffect(() => {
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [load, station])

  // Tick every second for ageing colors.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const bump = useCallback(
    async (orderId: string, action: 'start' | 'ready' | 'recall') => {
      setBumping(orderId)
      try {
        const res = await fetch('/api/pos/kds', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ orderId, action }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        await load()
      } catch (err) {
        toast.error(
          err instanceof Error
            ? `Не удалось обновить: ${err.message}`
            : 'Не удалось обновить'
        )
      } finally {
        setBumping(null)
      }
    },
    [load]
  )

  const grouped = useMemo(() => {
    const g: Record<string, KdsOrder[]> = { NEW: [], IN_PROCESS: [] }
    for (const o of orders) {
      if (o.orderStatus === 'IN_PROCESS') g.IN_PROCESS.push(o)
      else g.NEW.push(o)
    }
    return g
  }, [orders])

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col bg-slate-950 text-slate-50">
      <PosPageHeader
        title="Kitchen Display"
        backHref="/pos/dashboard"
        icon={<ChefHat className="h-4 w-4 text-amber-400" />}
        badge={
          <span className="text-[10px] text-slate-400">
            {REFRESH_MS / 1000}с · {orders.length} активных
          </span>
        }
        className="border-slate-800 bg-slate-900 text-slate-50"
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSoundOn((v) => !v)}
              className="text-slate-300 hover:text-white"
            >
              {soundOn ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => load()}
              className="text-slate-300 hover:text-white"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </>
        }
      />

      {/* Station filter chips (Hot/Cold/Bar/Grill/Bakery/Unrouted) */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-slate-800 bg-slate-900/60 px-4 py-2">
        {(['ALL', 'HOT', 'COLD', 'BAR', 'GRILL', 'BAKERY', 'UNROUTED'] as StationKey[]).map((key) => {
          const active = station === key
          const count =
            key === 'ALL'
              ? Object.values(stationCounts).reduce((s, n) => s + n, 0)
              : stationCounts[key] ?? 0
          if (key !== 'ALL' && count === 0 && !active) return null
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStation(key)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition',
                active
                  ? 'border-amber-400 bg-amber-400 text-slate-950'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
              )}
            >
              <span>{STATION_LABEL[key]}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px] tabular-nums',
                    active ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-200'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Body — two columns: NEW / IN_PROCESS */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <Column
          title="Новые"
          color="bg-amber-500"
          orders={grouped.NEW}
          now={now}
          bumping={bumping}
          onBump={bump}
          primaryAction="start"
          primaryLabel="Начать"
          PrimaryIcon={Play}
        />
        <Column
          title="В работе"
          color="bg-emerald-500"
          orders={grouped.IN_PROCESS}
          now={now}
          bumping={bumping}
          onBump={bump}
          primaryAction="ready"
          primaryLabel="Готово"
          PrimaryIcon={CheckCircle2}
        />
      </div>
    </div>
  )
}

function Column({
  title,
  color,
  orders,
  now,
  bumping,
  onBump,
  primaryAction,
  primaryLabel,
  PrimaryIcon,
}: {
  title: string
  color: string
  orders: KdsOrder[]
  now: number
  bumping: string | null
  onBump: (id: string, action: 'start' | 'ready' | 'recall') => void
  primaryAction: 'start' | 'ready'
  primaryLabel: string
  PrimaryIcon: React.ComponentType<{ className?: string }>
}) {
  return (
    <section className="flex min-h-0 flex-col border-slate-800 lg:[&:not(:last-child)]:border-r">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
        <div className="flex items-center gap-2">
          <span className={cn('h-2.5 w-2.5 rounded-full', color)} />
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            {title}
          </h2>
          <Badge variant="secondary" className="bg-slate-800 text-[11px] text-slate-300">
            {orders.length}
          </Badge>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-3 sm:grid-cols-2 xl:grid-cols-3">
        {orders.length === 0 ? (
          <div className="col-span-full grid place-items-center py-20 text-center text-slate-500">
            <Bell className="mb-2 h-10 w-10 opacity-40" />
            <p className="text-sm">Нет тикетов</p>
          </div>
        ) : (
          orders.map((o) => (
            <Ticket
              key={o.id}
              order={o}
              now={now}
              isBumping={bumping === o.id}
              onPrimary={() => onBump(o.id, primaryAction)}
              onRecall={() => onBump(o.id, 'recall')}
              primaryLabel={primaryLabel}
              PrimaryIcon={PrimaryIcon}
            />
          ))
        )}
      </div>
    </section>
  )
}

function Ticket({
  order,
  now,
  isBumping,
  onPrimary,
  onRecall,
  primaryLabel,
  PrimaryIcon,
}: {
  order: KdsOrder
  now: number
  isBumping: boolean
  onPrimary: () => void
  onRecall: () => void
  primaryLabel: string
  PrimaryIcon: React.ComponentType<{ className?: string }>
}) {
  const ageMin = (now - new Date(order.createdAt).getTime()) / 60000
  const tone =
    ageMin >= DANGER_MIN
      ? 'border-red-500/80 bg-red-500/15'
      : ageMin >= WARN_MIN
        ? 'border-amber-500/80 bg-amber-500/15'
        : 'border-slate-700 bg-slate-900'

  return (
    <article
      className={cn(
        'flex min-h-[220px] flex-col rounded-xl border-2 p-3 shadow-lg transition',
        tone
      )}
    >
      <header className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400">
            #{order.orderNumber}
          </div>
          <div className="text-2xl font-bold leading-tight">
            {order.serviceMode === 'DELIVERY'
              ? '🛵'
              : order.serviceMode === 'TAKEAWAY'
                ? '🥡'
                : order.tableId
                  ? `Стол ${String(order.tableId).slice(-3)}`
                  : 'В зале'}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1 text-xs text-slate-300">
            <Clock className="h-3 w-3" />
            <span className="tabular-nums">{formatTime(order.createdAt)}</span>
          </div>
          <div className="text-[11px] tabular-nums text-slate-400">
            {relativeTime(order.createdAt)}
          </div>
        </div>
      </header>

      <ul className="mt-3 flex-1 space-y-1.5">
        {order.items.map((it, i) => (
          <li key={i} className="rounded-md border border-slate-700/60 bg-slate-950/40 px-2.5 py-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-base font-semibold leading-tight">
                {it.quantity > 1 && (
                  <span className="mr-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-700 px-1.5 text-xs">
                    ×{it.quantity}
                  </span>
                )}
                {it.name}
              </div>
            </div>
            {it.modifiers && it.modifiers.length > 0 && (
              <div className="mt-0.5 text-xs text-slate-400">
                {it.modifiers.map((m) => `+ ${m.name}`).join(' · ')}
              </div>
            )}
            {it.notes && (
              <div className="mt-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-xs italic text-amber-200">
                ✎ {it.notes}
              </div>
            )}
          </li>
        ))}
      </ul>

      {order.notes && (
        <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs italic text-amber-200">
          ⚠ {order.notes}
        </div>
      )}

      <footer className="mt-3 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={onRecall}
          disabled={isBumping}
        >
          ↩
        </Button>
        <Button
          onClick={onPrimary}
          disabled={isBumping}
          className="h-9 flex-1 bg-emerald-500 text-white hover:bg-emerald-600"
        >
          {isBumping ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PrimaryIcon className="mr-2 h-4 w-4" />
          )}
          {primaryLabel}
        </Button>
      </footer>
    </article>
  )
}

let audioCtx: AudioContext | null = null
function chime() {
  if (typeof window === 'undefined') return
  try {
    if (!audioCtx) {
      const Ctor =
        (window as any).AudioContext || (window as any).webkitAudioContext
      if (!Ctor) return
      audioCtx = new Ctor()
    }
    const ctx = audioCtx!
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.value = 0.15
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    setTimeout(() => {
      osc.frequency.value = 1320
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
      osc.stop(ctx.currentTime + 0.3)
    }, 120)
  } catch {
    /* ignore */
  }
}
