/** Module 08: Orders Management */
import { z } from 'zod'

export type OrderStatus =
  | 'NEW' | 'CONFIRMED' | 'PREPARING' | 'READY'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'FAILED'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Новый',
  CONFIRMED: 'Подтверждён',
  PREPARING: 'Готовится',
  READY: 'Готов',
  OUT_FOR_DELIVERY: 'В доставке',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
  FAILED: 'Ошибка',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-indigo-100 text-indigo-700',
  PREPARING: 'bg-amber-100 text-amber-700',
  READY: 'bg-purple-100 text-purple-700',
  OUT_FOR_DELIVERY: 'bg-cyan-100 text-cyan-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
  FAILED: 'bg-red-100 text-red-700',
}

export type Order = {
  id: string
  number: string
  status: OrderStatus
  total: number
  currency: string
  customerId: string
  customerName: string
  customerPhone: string
  address: string
  courierId?: string
  items: { id: string; name: string; qty: number; price: number }[]
  notes?: string
  scheduledAt?: string
  createdAt: string
  updatedAt: string
}

export const OrderFilterSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  courierId: z.string().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(25),
})

export async function listOrders(filters: Record<string, unknown>) {
  const sp = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => v !== undefined && v !== '' && sp.set(k, String(v)))
  const r = await fetch(`/api/admin/orders?${sp}`)
  return r.json()
}

export async function updateOrder(id: string, patch: Partial<Order>) {
  const r = await fetch(`/api/admin/orders/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return r.json()
}

export async function bulkUpdateOrders(ids: string[], patch: Partial<Order>) {
  const r = await fetch('/api/admin/orders/bulk-update', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ids, patch }),
  })
  return r.json()
}
