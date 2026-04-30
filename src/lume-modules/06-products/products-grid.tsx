'use client'
import { useEffect, useState } from 'react'
import { Search, Plus, LayoutGrid, List } from 'lucide-react'
import { listProducts, type Product } from './index'
import { formatMoney } from '../_shared'

export function ProductsGrid() {
  const [items, setItems] = useState<Product[]>([])
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    listProducts({ search }).then((d) => setItems(d.items || d || [])).finally(() => setLoading(false))
  }, [search])

  return (
    <div className="space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Продукты</h1>
          <p className="text-sm text-slate-500">{items.length} позиций</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Новый продукт
        </button>
      </header>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск продукта…"
            className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        <div className="inline-flex border rounded-lg overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={`p-2 ${view === 'grid' ? 'bg-slate-100' : ''}`}
            aria-label="Сетка"
          ><LayoutGrid className="h-4 w-4" /></button>
          <button
            onClick={() => setView('list')}
            className={`p-2 ${view === 'list' ? 'bg-slate-100' : ''}`}
            aria-label="Список"
          ><List className="h-4 w-4" /></button>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-12 text-slate-400">Загрузка…</div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <article key={p.id} className="rounded-xl border bg-white overflow-hidden hover:shadow-md transition">
              <div className="aspect-square bg-slate-100 grid place-items-center text-slate-300 text-xs">
                {p.images?.[0] ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" /> : 'Нет фото'}
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm truncate">{p.name}</h3>
                <p className="text-xs text-slate-500 truncate">SKU: {p.sku}</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <strong>{formatMoney(p.price, p.currency)}</strong>
                  <span className={`text-xs ${p.stock > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {p.stock > 0 ? `В наличии: ${p.stock}` : 'Нет'}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm divide-y">
          {items.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-slate-50/60">
              <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-slate-500">SKU: {p.sku}</div>
              </div>
              <div className="text-sm font-semibold">{formatMoney(p.price, p.currency)}</div>
              <div className="text-xs text-slate-500 w-20 text-right">{p.stock} шт.</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
