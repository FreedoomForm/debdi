/** Module 10: Customers (Clients) */
export type Customer = {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  ordersCount: number
  totalSpent: number
  lastOrderAt?: string
  status: 'active' | 'paused' | 'blocked'
  plan?: string
  createdAt: string
}

export async function listCustomers(filters: Record<string, unknown>) {
  const sp = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => v !== undefined && v !== '' && sp.set(k, String(v)))
  const r = await fetch(`/api/admin/clients?${sp}`)
  return r.json()
}

export async function bulkUpdateCustomers(ids: string[], patch: Partial<Customer>) {
  const r = await fetch('/api/admin/clients/bulk-update', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ids, patch }),
  })
  return r.json()
}
