/** Module 25: Audit / Action Log */
export type AuditEntry = {
  id: string
  actorId: string
  actorName: string
  actorRole: string
  action: string
  entity: string
  entityId?: string
  changes?: Record<string, { from: unknown; to: unknown }>
  ip?: string
  userAgent?: string
  createdAt: string
}

export async function fetchAuditLog(filters: Record<string, unknown>) {
  const sp = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => v !== undefined && v !== '' && sp.set(k, String(v)))
  const r = await fetch(`/api/admin/action-logs?${sp}`)
  return r.json()
}

export function formatAuditChange(c: { from: unknown; to: unknown }): string {
  return `${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`
}
