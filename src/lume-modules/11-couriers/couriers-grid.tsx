'use client'
import { useEffect, useState } from 'react'
import { Bike, Car, User as UserIcon, MapPin, Star } from 'lucide-react'
import { listCouriers, type Courier } from './index'
import { formatMoney } from '../_shared'

const STATUS_COLOR: Record<string, string> = {
  online: 'bg-emerald-500',
  busy: 'bg-amber-500',
  offline: 'bg-slate-300',
}

const STATUS_LABEL: Record<string, string> = {
  online: 'На линии',
  busy: 'Занят',
  offline: 'Не в сети',
}

export function CouriersGrid() {
  const [items, setItems] = useState<Courier[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    listCouriers().then((d) => setItems(d.items || d || [])).finally(() => setLoading(false))
  }, [])
  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold">Курьеры</h1>
        <p className="text-sm text-slate-500">Состав курьеров и их текущий статус</p>
      </header>
      {loading ? (
        <div className="text-slate-400 py-12 text-center">Загрузка…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const Vehicle = c.vehicle === 'car' ? Car : c.vehicle === 'bike' ? Bike : UserIcon
            return (
              <article key={c.id} className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 grid place-items-center text-white font-semibold">
                      {c.name?.[0] ?? '?'}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white ${STATUS_COLOR[c.status]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{c.name}</h3>
                    <p className="text-xs text-slate-500 truncate">{c.phone}</p>
                    <p className="text-xs text-slate-500">{STATUS_LABEL[c.status]}</p>
                  </div>
                  <div className="text-amber-500 flex items-center gap-0.5 text-sm">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {c.rating?.toFixed(1) ?? '—'}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-xs text-slate-500">Активные</div>
                    <div className="font-bold">{c.currentOrders ?? 0}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-xs text-slate-500">Сегодня</div>
                    <div className="font-bold">{c.completedToday ?? 0}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-xs text-slate-500">Заработок</div>
                    <div className="font-bold text-xs">{formatMoney(c.earningsToday ?? 0)}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><Vehicle className="h-3.5 w-3.5" /> {c.vehicle ?? '—'}</span>
                  {c.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> онлайн</span>}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
