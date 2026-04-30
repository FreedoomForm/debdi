'use client'
import { useEffect, useState } from 'react'
import { Calendar, Save } from 'lucide-react'
import { fetchMenu, saveDailyMenu, type MenuItem } from './index'
import { formatMoney } from '../_shared'

export function MenuBuilder() {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [items, setItems] = useState<MenuItem[]>([])
  useEffect(() => {
    fetchMenu(date).then((d) => setItems(d.items || d || [])).catch(() => {})
  }, [date])
  return (
    <div className="space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Конструктор меню</h1>
          <p className="text-sm text-slate-500">Управление меню на дату</p>
        </div>
        <div className="flex gap-2">
          <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg">
            <Calendar className="h-4 w-4 text-slate-500" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="outline-none" />
          </label>
          <button
            onClick={() => saveDailyMenu(date, items)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          ><Save className="h-4 w-4" /> Сохранить</button>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <article key={it.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="font-medium">{it.name}</h3>
            <p className="text-xs text-slate-500">{it.category}</p>
            <div className="mt-2 flex items-baseline justify-between">
              <strong>{formatMoney(it.price)}</strong>
              <label className="inline-flex items-center gap-1 text-xs">
                <input
                  type="checkbox" checked={it.available}
                  onChange={(e) => setItems(items.map((x) => x.id === it.id ? { ...x, available: e.target.checked } : x))}
                /> Доступно
              </label>
            </div>
          </article>
        ))}
        {items.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">Меню на эту дату ещё не задано</div>
        )}
      </div>
    </div>
  )
}
