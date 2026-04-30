/** Module 24: Import / Export (XLSX / CSV) */
export type ImportEntity = 'customers' | 'orders' | 'products' | 'ingredients' | 'menus'
export type ImportResult = {
  imported: number
  updated: number
  skipped: number
  errors: { row: number; reason: string }[]
}

export async function importXlsx(entity: ImportEntity, file: File): Promise<ImportResult> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('entity', entity)
  const r = await fetch('/api/admin/database-import-xlsx', { method: 'POST', body: fd })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function importXlsxAll(file: File): Promise<Record<string, ImportResult>> {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch('/api/admin/database-import-xlsx-all', { method: 'POST', body: fd })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function exportSnapshot() {
  const r = await fetch('/api/admin/database-snapshot')
  return r.blob()
}
