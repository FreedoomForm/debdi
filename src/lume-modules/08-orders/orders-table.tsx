'use client'
import { useEffect, useState } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { listOrders, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type Order, type OrderStatus } from './index'
import { formatMoney, formatDate } from '../_shared'

export function LumeOrdersTable() {
  const [orders, setOrders] = useState<Order[]>([])
  const [status, setStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    listOrders({ status, search })
      .then((d) => setOrders(d.items || d || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [status, search])

  return (
    <div className="space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Заказы</h1>
          <p className="text-sm text-slate-500">Все заказы платформы</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Обновить
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по номеру, клиенту, телефону…"
            className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${status === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Все
          </button>
          {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${status === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {ORDER_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">№</th>
              <th className="text-left px-5 py-3 font-semibold">Клиент</th>
              <th className="text-left px-5 py-3 font-semibold">Сумма</th>
              <th className="text-left px-5 py-3 font-semibold">Статус</th>
              <th className="text-left px-5 py-3 font-semibold">Курьер</th>
              <th className="text-left px-5 py-3 font-semibold">Дата</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">Загрузка…</td></tr>
            )}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">Нет заказов</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50/60 cursor-pointer">
                <td className="px-5 py-3 font-mono text-xs">#{o.number}</td>
                <td className="px-5 py-3">
                  <div className="font-medium">{o.customerName}</div>
                  <div className="text-xs text-slate-500">{o.customerPhone}</div>
                </td>
                <td className="px-5 py-3 font-semibold">{formatMoney(o.total, o.currency)}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[o.status]}`}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-700">{o.courierId ? o.courierId.slice(0, 8) : <span className="text-slate-400">—</span>}</td>
                <td className="px-5 py-3 text-slate-600">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
