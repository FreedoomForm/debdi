/** Module 16: Reports & Export */
export type ReportType =
  | 'orders' | 'revenue' | 'customers' | 'couriers'
  | 'inventory' | 'finance' | 'audit'

export type ReportFormat = 'csv' | 'xlsx' | 'pdf'

export async function generateReport(type: ReportType, format: ReportFormat, filters: Record<string, unknown>) {
  const sp = new URLSearchParams({ type, format })
  Object.entries(filters).forEach(([k, v]) => v !== undefined && sp.set(k, String(v)))
  const r = await fetch(`/api/admin/reports?${sp}`, { method: 'POST' })
  return r.blob()
}

export function downloadReportBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
