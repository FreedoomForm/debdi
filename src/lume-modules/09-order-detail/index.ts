/** Module 09: Order Detail / Tracking */
export type OrderTimelineEvent = {
  id: string
  type: 'status_change' | 'note' | 'courier_assigned' | 'payment' | 'delivery'
  at: string
  actor: string
  data: Record<string, unknown>
}

export async function fetchOrderTimeline(orderId: string): Promise<OrderTimelineEvent[]> {
  const r = await fetch(`/api/admin/orders/${orderId}/timeline`)
  if (!r.ok) return []
  return r.json()
}

export function summarizeOrder(items: { qty: number; price: number }[]) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0)
  return {
    subtotal,
    delivery: subtotal < 100000 ? 15000 : 0,
    discount: 0,
    total: subtotal + (subtotal < 100000 ? 15000 : 0),
  }
}
