'use client'
/**
 * Live status strip for the POS dashboard.
 *
 * Self-contained widget that polls /api/pos/dashboard/live every 15 seconds
 * and surfaces operational counters: open orders awaiting attention, low
 * stock SKUs, current shift state, and unread notifications.
 *
 * Designed to live just below the page header so managers can spot anomalies
 * at a glance, without scrolling.
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  Boxes,
  Clock,
  Loader2,
  Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatTime } from '@/lib/pos'

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
  today: { revenue: number; orders: number }
}

export function LiveStrip() {
  const [snap, setSnap] = useState<LiveSnapshot | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/dashboard/live', {
        credentials: 'include',
      })
      if (!res.ok) return
      setSnap(await res.json())
    } catch {
      /* silent — keeps the strip resilient when the network blips */
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  if (!snap) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Загрузка статуса…
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Tile
        href="/pos/orders"
        icon={<Receipt className="h-3.5 w-3.5" />}
        label="Активные"
        value={String(snap.openOrders)}
        accent={snap.openOrders > 0 ? 'amber' : 'neutral'}
        hint="заказов в работе"
      />
      <Tile
        href="/pos/inventory"
        icon={<Boxes className="h-3.5 w-3.5" />}
        label="Мало товара"
        value={String(snap.lowStock)}
        accent={snap.lowStock > 0 ? 'rose' : 'neutral'}
        hint="ниже минимума"
      />
      <Tile
        href="/pos/shift"
        icon={<Clock className="h-3.5 w-3.5" />}
        label="Смена"
        value={
          snap.openShift
            ? `с ${formatTime(snap.openShift.openedAt)}`
            : 'Закрыта'
        }
        accent={snap.openShift ? 'emerald' : 'neutral'}
        hint={
          snap.openShift
            ? `${formatCurrency(snap.openShift.totalSales, 'UZS')}`
            : 'нажмите, чтобы открыть'
        }
      />
      <Tile
        href="/middle-admin"
        icon={<Bell className="h-3.5 w-3.5" />}
        label="Уведомления"
        value={String(snap.unreadNotifs)}
        accent={snap.unreadNotifs > 0 ? 'violet' : 'neutral'}
        hint="не прочитано"
      />
    </div>
  )
}

function Tile({
  href,
  icon,
  label,
  value,
  hint,
  accent,
}: {
  href: string
  icon: React.ReactNode
  label: string
  value: string
  hint: string
  accent: 'amber' | 'rose' | 'emerald' | 'violet' | 'neutral'
}) {
  const accentClass = {
    amber: 'border-amber-200 bg-amber-50/60',
    rose: 'border-rose-200 bg-rose-50/60',
    emerald: 'border-emerald-200 bg-emerald-50/60',
    violet: 'border-violet-200 bg-violet-50/60',
    neutral: 'border-border bg-card',
  }[accent]
  const valueClass = {
    amber: 'text-amber-900',
    rose: 'text-rose-900',
    emerald: 'text-emerald-900',
    violet: 'text-violet-900',
    neutral: 'text-foreground',
  }[accent]
  return (
    <Link
      href={href}
      className={cn(
        'rounded-xl border p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
        accentClass
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={cn('mt-0.5 truncate text-base font-bold tabular-nums', valueClass)}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </Link>
  )
}
