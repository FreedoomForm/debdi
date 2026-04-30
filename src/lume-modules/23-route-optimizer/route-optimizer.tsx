'use client'
import { useState } from 'react'
import { Wand2, Map, Clock, Route as RouteIcon } from 'lucide-react'
import { optimizeRoute, type OptimizedRoute } from './index'

export function RouteOptimizer() {
  const [result, setResult] = useState<OptimizedRoute | null>(null)
  const [loading, setLoading] = useState(false)
  const onRun = async () => {
    setLoading(true)
    try { setResult(await optimizeRoute('demo', [])) } finally { setLoading(false) }
  }
  return (
    <div className="space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Оптимизация маршрута</h1>
          <p className="text-sm text-slate-500">VRP-решатель на базе ORS</p>
        </div>
        <button
          onClick={onRun} disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        ><Wand2 className="h-4 w-4" /> {loading ? 'Оптимизация…' : 'Оптимизировать'}</button>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Точек</p>
          <h3 className="text-2xl font-bold">{result?.points.length ?? 0}</h3>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500 inline-flex items-center gap-1"><RouteIcon className="h-3.5 w-3.5" /> Дистанция</p>
          <h3 className="text-2xl font-bold">{result?.totalDistanceKm?.toFixed(1) ?? 0} км</h3>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500 inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Время</p>
          <h3 className="text-2xl font-bold">{result?.totalDurationMin ?? 0} мин</h3>
        </div>
      </div>
      <div className="rounded-2xl border bg-white shadow-sm h-[400px] grid place-items-center text-slate-400">
        <div className="text-center">
          <Map className="h-10 w-10 mx-auto mb-2 text-slate-300" />
          Карта оптимизированного маршрута (Leaflet + polyline)
        </div>
      </div>
    </div>
  )
}
