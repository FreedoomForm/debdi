'use client'
import { useEffect, useState } from 'react'
import { Clock, Package, MapPin, User, Phone } from 'lucide-react'
import { fetchOrderTimeline, summarizeOrder, type OrderTimelineEvent } from './index'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type Order } from '../08-orders/index'
import { formatMoney, formatDate } from '../_shared'

export function OrderDetail({ order }: { order: Order }) {
  const [timeline, setTimeline] = useState<OrderTimelineEvent[]>([])
  useEffect(() => { fetchOrderTimeline(order.id).then(setTimeline) }, [order.id])
  const totals = summarizeOrder(order.items.map((i) => ({ qty: i.qty, price: i.price })))
  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4 p-6">
      <main className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Заказ #{order.number}</h1>
            <p className="text-sm text-slate-500">{formatDate(order.createdAt)}</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </header>
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Package className="h-4 w-4" /> Состав заказа</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr><th className="text-left pb-2">Позиция</th><th className="pb-2">Кол.</th><th className="text-right pb-2">Цена</th><th className="text-right pb-2">Итого</th></tr>
            </thead>
            <tbody className="divide-y">
              {order.items.map((it) => (
                <tr key={it.id}>
                  <td className="py-2">{it.name}</td>
                  <td className="text-center">{it.qty}</td>
                  <td className="text-right">{formatMoney(it.price, order.currency)}</td>
                  <td className="text-right font-medium">{formatMoney(it.price * it.qty, order.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 pt-3 border-t space-y-1 text-sm">
            <div className="flex justify-between text-slate-600"><span>Подытог</span><span>{formatMoney(totals.subtotal, order.currency)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Доставка</span><span>{formatMoney(totals.delivery, order.currency)}</span></div>
            <div className="flex justify-between font-bold text-base mt-2"><span>Итого</span><span>{formatMoney(totals.total, order.currency)}</span></div>
          </div>
        </section>
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4" /> Хронология</h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-400">Событий пока нет</p>
          ) : (
            <ul className="space-y-2.5">
              {timeline.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0" />
                  <div className="flex-1">
                    <p><strong>{e.actor}</strong> — {e.type}</p>
                    <p className="text-xs text-slate-400">{formatDate(e.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <aside className="space-y-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-2">
          <h3 className="font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Клиент</h3>
          <p className="font-medium">{order.customerName}</p>
          <p className="text-sm text-slate-600 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {order.customerPhone}</p>
          <p className="text-sm text-slate-600 flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {order.address}</p>
        </div>
        {order.notes && (
          <div className="rounded-2xl border bg-amber-50 border-amber-200 p-4 text-sm">
            <strong>Комментарий:</strong> {order.notes}
          </div>
        )}
      </aside>
    </div>
  )
}
