'use client'
import { useEffect, useState } from 'react'
import { Map, Play, Wand2 } from 'lucide-react'
import { fetchDispatchBoard, startDispatchDay, optimizeDispatchRoutes, type DispatchOrder } from './index'

export function DispatchBoard() {
  const today = new Date().toISOString().slice(0, 10)
  const [items, setItems] = useState<DispatchOrder[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    setLoading(true)
    fetchDispatchBoard(today).then((d) => setItems(d.orders || d || [])).finally(() => setLoading(false))
  }, [today])
  return (
    <div className="space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Диспетчер</h1>
          <p className="text-sm text-slate-500">Заказы и распределение по курьерам · {today}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => startDispatchDay()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-slate-50 text-sm"
          ><Play className="h-4 w-4" /> Запустить день</button>
          <button
            onClick={() => optimizeDispatchRoutes(items.map((i) => i.id), [])}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          ><Wand2 className="h-4 w-4" /> Оптимизировать</button>
        </div>
      </header>
      <div className="rounded-2xl border bg-white shadow-sm h-[420px] grid place-items-center text-slate-400">
        <div className="text-center">
          <Map className="h-10 w-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">Карта диспетчера (Leaflet) · {loading ? 'загрузка…' : `${items.length} заказов`}</p>
        </div>
      </div>
    </div>
  )
}
