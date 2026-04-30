'use client'
import { useEffect, useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import { listCustomers, type Customer } from './index'
import { formatMoney, formatDate } from '../_shared'

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  paused: 'bg-amber-50 text-amber-700 ring-amber-200',
  blocked: 'bg-red-50 text-red-700 ring-red-200',
}

export function CustomersTable() {
  const [items, setItems] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    listCustomers({ search }).then((d) => setItems(d.items || d || [])).finally(() => setLoading(false))
  }, [search])

  return (
    <div className="space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Клиенты</h1>
          <p className="text-sm text-slate-500">База клиентов с историей заказов</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <UserPlus className="h-4 w-4" /> Добавить клиента
        </button>
      </header>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени, телефону, email…"
          className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
        />
      </div>
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Клиент</th>
              <th className="text-left px-5 py-3 font-semibold">Телефон</th>
              <th className="text-left px-5 py-3 font-semibold">Заказов</th>
              <th className="text-left px-5 py-3 font-semibold">Сумма</th>
              <th className="text-left px-5 py-3 font-semibold">Тариф</th>
              <th className="text-left px-5 py-3 font-semibold">Статус</th>
              <th className="text-left px-5 py-3 font-semibold">Создан</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={7} className="text-center py-12 text-slate-400">Загрузка…</td></tr>}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">Нет клиентов</td></tr>
            )}
            {items.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3">
                  <div className="font-medium">{c.name}</div>
                  {c.email && <div className="text-xs text-slate-500">{c.email}</div>}
                </td>
                <td className="px-5 py-3 text-slate-700">{c.phone}</td>
                <td className="px-5 py-3 font-semibold">{c.ordersCount ?? 0}</td>
                <td className="px-5 py-3 font-semibold">{formatMoney(c.totalSpent ?? 0)}</td>
                <td className="px-5 py-3 text-slate-700">{c.plan ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE[c.status] ?? STATUS_BADGE.active}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-600 text-xs">{c.createdAt ? formatDate(c.createdAt) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
