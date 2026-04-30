'use client'
import { useEffect, useState } from 'react'
import { fetchOrdersOverTime, fetchRevenueOverTime, type StatRange, type SeriesPoint } from './index'

export function ChartsBlock({ range = '30d' as StatRange }: { range?: StatRange }) {
  const [orders, setOrders] = useState<SeriesPoint[]>([])
  const [revenue, setRevenue] = useState<SeriesPoint[]>([])
  useEffect(() => {
    fetchOrdersOverTime(range).then(setOrders).catch(() => {})
    fetchRevenueOverTime(range).then(setRevenue).catch(() => {})
  }, [range])
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="font-semibold mb-2">Заказы</h3>
        <p className="text-sm text-slate-500 mb-4">Динамика за период</p>
        <div className="h-64 grid place-items-center text-slate-400 text-sm">
          {orders.length} точек данных (Recharts)
        </div>
      </div>
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="font-semibold mb-2">Выручка</h3>
        <p className="text-sm text-slate-500 mb-4">Тренд за период</p>
        <div className="h-64 grid place-items-center text-slate-400 text-sm">
          {revenue.length} точек данных (Recharts)
        </div>
      </div>
    </div>
  )
}
