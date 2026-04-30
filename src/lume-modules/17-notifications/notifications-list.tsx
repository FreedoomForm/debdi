'use client'
import { useEffect, useState } from 'react'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { listNotifications, markNotificationRead, markAllNotificationsRead, type LumeNotification } from './index'
import { formatDate } from '../_shared'

const SEVERITY_COLOR: Record<string, string> = {
  info: 'bg-blue-50 text-blue-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-700',
}

export function NotificationsList() {
  const [items, setItems] = useState<LumeNotification[]>([])
  const [loading, setLoading] = useState(true)
  const reload = () => {
    setLoading(true)
    listNotifications().then((d) => setItems(d.items || d || [])).finally(() => setLoading(false))
  }
  useEffect(reload, [])
  const unread = items.filter((n) => !n.read).length
  return (
    <div className="space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Уведомления</h1>
          <p className="text-sm text-slate-500">{unread} непрочитанных</p>
        </div>
        <button
          onClick={async () => { await markAllNotificationsRead(); reload() }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-slate-50 text-sm"
        >
          <CheckCheck className="h-4 w-4" /> Отметить все прочитанными
        </button>
      </header>
      <div className="rounded-2xl border bg-white shadow-sm divide-y">
        {loading && <div className="p-8 text-center text-slate-400">Загрузка…</div>}
        {!loading && items.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            Уведомлений нет
          </div>
        )}
        {items.map((n) => (
          <div key={n.id} className={`flex items-start gap-3 p-4 ${!n.read ? 'bg-blue-50/40' : ''}`}>
            <span className={`shrink-0 w-9 h-9 rounded-lg grid place-items-center ${SEVERITY_COLOR[n.severity ?? 'info']}`}>
              <Bell className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm">{n.title}</h4>
              <p className="text-sm text-slate-600">{n.body}</p>
              <p className="text-xs text-slate-400 mt-1">{formatDate(n.createdAt)}</p>
            </div>
            {!n.read && (
              <button
                onClick={async () => { await markNotificationRead(n.id); reload() }}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                aria-label="Прочитано"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
