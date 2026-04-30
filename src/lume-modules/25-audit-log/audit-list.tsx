'use client'
import { useEffect, useState } from 'react'
import { ScrollText, User as UserIcon } from 'lucide-react'
import { fetchAuditLog, formatAuditChange, type AuditEntry } from './index'
import { formatDate } from '../_shared'

export function AuditList() {
  const [items, setItems] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetchAuditLog({}).then((d) => setItems(d.items || d || [])).finally(() => setLoading(false))
  }, [])
  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold">Журнал действий</h1>
        <p className="text-sm text-slate-500">Все важные изменения в системе</p>
      </header>
      <div className="rounded-2xl border bg-white shadow-sm divide-y">
        {loading && <div className="p-8 text-center text-slate-400">Загрузка…</div>}
        {!loading && items.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            <ScrollText className="h-8 w-8 mx-auto mb-2 text-slate-300" /> Пусто
          </div>
        )}
        {items.map((e) => (
          <div key={e.id} className="flex items-start gap-3 p-4 hover:bg-slate-50/60">
            <div className="w-9 h-9 rounded-full bg-slate-100 grid place-items-center shrink-0">
              <UserIcon className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm">
                <strong>{e.actorName}</strong>{' '}
                <span className="text-slate-500">({e.actorRole})</span>{' '}
                — <span className="font-medium">{e.action}</span>{' '}
                <span className="text-slate-500">{e.entity}</span>
                {e.entityId && <span className="text-slate-400 font-mono"> #{e.entityId.slice(0, 8)}</span>}
              </div>
              {e.changes && (
                <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                  {Object.entries(e.changes).map(([k, c]) => (
                    <li key={k}><span className="text-slate-400">{k}:</span> {formatAuditChange(c)}</li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-slate-400 mt-1">{formatDate(e.createdAt)} · {e.ip}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
