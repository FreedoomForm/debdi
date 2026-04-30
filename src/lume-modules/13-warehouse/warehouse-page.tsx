'use client'
import { useEffect, useState } from 'react'
import { Package, AlertTriangle } from 'lucide-react'
import { listIngredients, type Ingredient } from './index'
import { formatMoney } from '../_shared'

export function WarehousePage() {
  const [items, setItems] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    listIngredients().then((d) => setItems(d.items || d || [])).finally(() => setLoading(false))
  }, [])
  const lowStock = items.filter((i) => i.stock <= i.lowStockThreshold)
  return (
    <div className="space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Склад</h1>
          <p className="text-sm text-slate-500">Ингредиенты и запасы</p>
        </div>
        {lowStock.length > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {lowStock.length} позиций — низкий остаток
          </div>
        )}
      </header>
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Наименование</th>
              <th className="text-left px-5 py-3 font-semibold">Остаток</th>
              <th className="text-left px-5 py-3 font-semibold">Минимум</th>
              <th className="text-left px-5 py-3 font-semibold">Цена за ед.</th>
              <th className="text-left px-5 py-3 font-semibold">Поставщик</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={5} className="text-center py-12 text-slate-400">Загрузка…</td></tr>}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400">
                <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" /> Склад пуст
              </td></tr>
            )}
            {items.map((i) => {
              const low = i.stock <= i.lowStockThreshold
              return (
                <tr key={i.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-medium">{i.name}</td>
                  <td className={`px-5 py-3 font-semibold ${low ? 'text-red-600' : ''}`}>
                    {i.stock} {i.unit}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{i.lowStockThreshold} {i.unit}</td>
                  <td className="px-5 py-3 text-slate-600">{formatMoney(i.costPerUnit)}</td>
                  <td className="px-5 py-3 text-slate-600">{i.supplier ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
