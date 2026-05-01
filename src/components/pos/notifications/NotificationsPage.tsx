'use client'
/**
 * /pos/notifications — modern notifications inbox.
 *
 * Surfaces /api/pos/notifications (GET + PATCH) which previously had no
 * dedicated UI page. Lists every notification for the current admin with
 * filters (all / unread), bulk "mark all read" action, and per-row
 * mark-as-read.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Bell,
  BellOff,
  CheckCheck,
  CircleDot,
  ExternalLink,
  Inbox,
  Loader2,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'

type Notification = {
  id: string
  type: string
  title: string
  body?: string | null
  link?: string | null
  data?: unknown
  isRead: boolean
  createdAt: string
}

type Filter = 'all' | 'unread' | 'read'

const TYPE_LABELS: Record<string, string> = {
  ORDER_NEW: 'Новый заказ',
  ORDER_STATUS_CHANGED: 'Изменение статуса заказа',
  ORDER_DELETED: 'Удалённый заказ',
  CASH_DRAWER: 'Касса',
  KDS_TICKET: 'KDS тикет',
  LOW_STOCK: 'Низкий остаток',
  SHIFT: 'Смена',
  CHAT_MESSAGE: 'Сообщение',
  SYSTEM: 'Система',
}

const TYPE_TONES: Record<string, string> = {
  ORDER_NEW: 'bg-emerald-100 text-emerald-800',
  ORDER_STATUS_CHANGED: 'bg-blue-100 text-blue-800',
  ORDER_DELETED: 'bg-rose-100 text-rose-800',
  LOW_STOCK: 'bg-amber-100 text-amber-800',
  CASH_DRAWER: 'bg-cyan-100 text-cyan-800',
  KDS_TICKET: 'bg-violet-100 text-violet-800',
  SHIFT: 'bg-indigo-100 text-indigo-800',
  CHAT_MESSAGE: 'bg-sky-100 text-sky-800',
  SYSTEM: 'bg-slate-100 text-slate-800',
}

function formatRelative(value: string) {
  const ts = new Date(value).getTime()
  const diff = Date.now() - ts
  if (Number.isNaN(ts)) return '—'
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'только что'
  if (min < 60) return `${min} мин назад`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} ч назад`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} дн назад`
  return new Date(value).toLocaleDateString('ru-RU')
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [rowBusyId, setRowBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/notifications', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as {
        items?: Notification[]
        unreadCount?: number
      }
      setItems(data.items ?? [])
      setUnreadCount(data.unreadCount ?? 0)
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
    // Auto-refresh every 30s so admins see fresh items.
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [load])

  const filteredItems = useMemo(() => {
    let list = items
    if (filter === 'unread') list = list.filter((n) => !n.isRead)
    else if (filter === 'read') list = list.filter((n) => n.isRead)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.body ?? '').toLowerCase().includes(q) ||
          (TYPE_LABELS[n.type] ?? n.type).toLowerCase().includes(q)
      )
    }
    return list
  }, [items, filter, query])

  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayCount = items.filter(
      (n) => new Date(n.createdAt).getTime() >= today.getTime()
    ).length
    const byType = items.reduce<Record<string, number>>((acc, n) => {
      acc[n.type] = (acc[n.type] ?? 0) + 1
      return acc
    }, {})
    const topType = Object.entries(byType).sort(([, a], [, b]) => b - a)[0]
    return {
      total: items.length,
      unread: unreadCount,
      today: todayCount,
      topType: topType ? TYPE_LABELS[topType[0]] ?? topType[0] : '—',
    }
  }, [items, unreadCount])

  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return
      try {
        const res = await fetch('/api/pos/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ids }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        await load()
      } catch (err) {
        toast.error(
          err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось обновить'
        )
      }
    },
    [load]
  )

  const markAllRead = async () => {
    if (unreadCount === 0) return
    setBulkBusy(true)
    try {
      const res = await fetch('/api/pos/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ all: true }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Все уведомления прочитаны')
      await load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось'
      )
    } finally {
      setBulkBusy(false)
    }
  }

  const toggleRead = async (n: Notification) => {
    if (n.isRead) {
      // No "unread" endpoint; keep parity with API surface.
      toast('Уведомление уже прочитано')
      return
    }
    setRowBusyId(n.id)
    try {
      await markRead([n.id])
    } finally {
      setRowBusyId(null)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Уведомления"
        icon={<Bell className="h-4 w-4 text-amber-500" />}
        backHref="/pos/dashboard"
        badge={unreadCount > 0 ? unreadCount : undefined}
        actions={
          <>
            <RefreshButton onClick={load} loading={loading} />
            <Button
              size="sm"
              onClick={markAllRead}
              disabled={bulkBusy || unreadCount === 0}
            >
              {bulkBusy ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
              )}
              Прочитать всё
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            label="Всего"
            value={String(stats.total)}
            icon={<Inbox className="h-4 w-4" />}
            tone="neutral"
            hint="Последние 100 уведомлений"
          />
          <KpiTile
            label="Непрочитанные"
            value={String(stats.unread)}
            icon={<CircleDot className="h-4 w-4" />}
            tone={stats.unread > 0 ? 'amber' : 'emerald'}
            hint={stats.unread > 0 ? 'Требуют внимания' : 'Всё прочитано'}
          />
          <KpiTile
            label="Сегодня"
            value={String(stats.today)}
            icon={<Bell className="h-4 w-4" />}
            tone={stats.today > 0 ? 'cyan' : 'neutral'}
            hint="Поступили сегодня"
          />
          <KpiTile
            label="Чаще всего"
            value={stats.topType}
            icon={<BellOff className="h-4 w-4" />}
            tone="violet"
            hint="Самый частый тип"
          />
        </div>

        <Card>
          <CardContent className="space-y-3 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Tabs
                value={filter}
                onValueChange={(v) => setFilter(v as Filter)}
                className="flex-1"
              >
                <TabsList>
                  <TabsTrigger value="all">Все ({items.length})</TabsTrigger>
                  <TabsTrigger value="unread">
                    Непрочитанные ({stats.unread})
                  </TabsTrigger>
                  <TabsTrigger value="read">
                    Прочитанные ({items.length - stats.unread})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-[260px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Поиск по тексту"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
            </div>

            {loading ? (
              <div className="grid place-items-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
                <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {filter === 'unread'
                    ? 'Нет непрочитанных уведомлений'
                    : filter === 'read'
                      ? 'Нет прочитанных уведомлений'
                      : 'Уведомлений пока нет'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Они появятся здесь автоматически при новых заказах,
                  низком остатке, событиях смены и т.д.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {filteredItems.map((n) => {
                  const tone =
                    TYPE_TONES[n.type] ?? 'bg-slate-100 text-slate-800'
                  const label = TYPE_LABELS[n.type] ?? n.type
                  const busy = rowBusyId === n.id
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        'flex items-start gap-3 p-3 transition',
                        !n.isRead && 'bg-amber-50/40'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1 h-2 w-2 shrink-0 rounded-full',
                          n.isRead ? 'bg-muted-foreground/30' : 'bg-amber-500'
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px]', tone)}
                          >
                            {label}
                          </Badge>
                          <span
                            className={cn(
                              'text-sm',
                              !n.isRead && 'font-semibold'
                            )}
                          >
                            {n.title}
                          </span>
                        </div>
                        {n.body && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {n.body}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{formatRelative(n.createdAt)}</span>
                          {n.link && (
                            <Link
                              href={n.link}
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Открыть
                            </Link>
                          )}
                        </div>
                      </div>
                      {!n.isRead && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => toggleRead(n)}
                          disabled={busy}
                        >
                          {busy ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCheck className="mr-1 h-3 w-3" />
                          )}
                          Прочитал
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
