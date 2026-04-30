'use client'
/**
 * Notifications bell — small popover that lists the latest unread
 * notifications (low-stock, payment received, shift events, etc.) for
 * the current owner.
 *
 * Mounted in the UnifiedShell top-right corner. Polls /api/pos/notifications
 * every 30s via the shared usePolling hook and surfaces an unread badge.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/pos'
import { usePolling } from '@/hooks/usePolling'

type Notification = {
  id: string
  type: string
  title: string
  body?: string | null
  link?: string | null
  isRead: boolean
  createdAt: string
}

type NotificationsResponse = {
  items?: Notification[]
  unreadCount?: number
}

const TYPE_TONE: Record<string, string> = {
  ORDER_CREATED: 'bg-blue-500',
  ORDER_STATUS_CHANGED: 'bg-blue-500',
  PAYMENT_RECEIVED: 'bg-emerald-500',
  LOW_STOCK: 'bg-rose-500',
  SHIFT_OPENED: 'bg-amber-500',
  SHIFT_CLOSED: 'bg-slate-500',
  RESERVATION_REMINDER: 'bg-violet-500',
  SYSTEM: 'bg-indigo-500',
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [marking, setMarking] = useState(false)
  const [overlayItems, setOverlayItems] = useState<Notification[] | null>(null)
  const [overlayUnread, setOverlayUnread] = useState<number | null>(null)

  const { data, loading, refresh } = usePolling<NotificationsResponse>(
    '/api/pos/notifications',
    30000
  )

  // Reset local overlay whenever a fresh poll lands.
  useEffect(() => {
    if (data) {
      setOverlayItems(null)
      setOverlayUnread(null)
    }
  }, [data])

  const items = overlayItems ?? data?.items ?? []
  const unread = overlayUnread ?? data?.unreadCount ?? 0

  const markAllRead = async () => {
    setMarking(true)
    try {
      await fetch('/api/pos/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ all: true }),
      })
      setOverlayItems(items.map((n) => ({ ...n, isRead: true })))
      setOverlayUnread(0)
      refresh()
    } finally {
      setMarking(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Уведомления"
          className="relative grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <header className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Уведомления</span>
            {unread > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {unread}
              </Badge>
            )}
          </div>
          {unread > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={markAllRead}
              disabled={marking}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Все прочитано
            </Button>
          )}
        </header>
        <ScrollArea className="max-h-[420px]">
          {loading && items.length === 0 ? (
            <div className="grid place-items-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-10 text-center text-xs text-muted-foreground">
              Нет уведомлений.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const tone = TYPE_TONE[n.type] ?? 'bg-slate-400'
                const Body = n.link ? Link : 'div'
                return (
                  <li key={n.id}>
                    <Body
                      href={n.link ?? '#'}
                      onClick={() => n.link && setOpen(false)}
                      className={cn(
                        'flex items-start gap-2 px-3 py-2 transition',
                        n.isRead ? 'opacity-70' : 'bg-background',
                        n.link && 'hover:bg-accent'
                      )}
                    >
                      <span
                        className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', tone)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {n.title}
                          </span>
                          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                            {relativeTime(n.createdAt)}
                          </span>
                        </div>
                        {n.body && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {n.body}
                          </p>
                        )}
                      </div>
                    </Body>
                  </li>
                )
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
