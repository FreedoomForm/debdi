'use client'
import { useState } from 'react'
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'
import { importXlsx, importXlsxAll, exportSnapshot, type ImportEntity, type ImportResult } from './index'

const ENTITIES: { value: ImportEntity; label: string }[] = [
  { value: 'customers', label: 'Клиенты' },
  { value: 'orders', label: 'Заказы' },
  { value: 'products', label: 'Продукты' },
  { value: 'ingredients', label: 'Ингредиенты' },
  { value: 'menus', label: 'Меню' },
]

export function ImportExportPanel() {
  const [entity, setEntity] = useState<ImportEntity>('customers')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onImport = async () => {
    if (!file) return
    setLoading(true); setError(null); setResult(null)
    try {
      const r = await importXlsx(entity, file)
      setResult(r)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const onExport = async () => {
    const blob = await exportSnapshot()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `debdi-snapshot-${Date.now()}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold">Импорт / Экспорт</h1>
        <p className="text-sm text-slate-500">Массовые операции с данными в формате XLSX</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Upload className="h-4 w-4 text-blue-600" /> Импорт XLSX
          </h3>
          <div className="space-y-3">
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value as ImportEntity)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
            >
              {ENTITIES.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
            <label className="block">
              <input
                type="file" accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100"
              />
            </label>
            <button
              onClick={onImport} disabled={!file || loading}
              className="w-full h-10 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" /> {loading ? 'Импорт…' : 'Импортировать'}
            </button>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}
            {result && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" /> Готово
                </div>
                <ul className="mt-1 space-y-0.5 text-xs">
                  <li>Импортировано: {result.imported}</li>
                  <li>Обновлено: {result.updated}</li>
                  <li>Пропущено: {result.skipped}</li>
                  {result.errors.length > 0 && <li>Ошибок: {result.errors.length}</li>}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Download className="h-4 w-4 text-emerald-600" /> Экспорт snapshot
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Скачайте полный snapshot базы данных в формате XLSX со всеми сущностями.
          </p>
          <button
            onClick={onExport}
            className="w-full h-10 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 inline-flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" /> Скачать snapshot
          </button>
        </div>
      </div>
    </div>
  )
}
