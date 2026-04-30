'use client'
import { useState } from 'react'
import { FileText, Download } from 'lucide-react'
import { generateReport, downloadReportBlob, type ReportType, type ReportFormat } from './index'

const REPORT_TYPES: { key: ReportType; label: string }[] = [
  { key: 'orders', label: 'Заказы' },
  { key: 'revenue', label: 'Выручка' },
  { key: 'customers', label: 'Клиенты' },
  { key: 'couriers', label: 'Курьеры' },
  { key: 'inventory', label: 'Склад' },
  { key: 'finance', label: 'Финансы' },
  { key: 'audit', label: 'Журнал' },
]
const FORMATS: ReportFormat[] = ['csv', 'xlsx', 'pdf']

export function ReportsPanel() {
  const [type, setType] = useState<ReportType>('orders')
  const [format, setFormat] = useState<ReportFormat>('xlsx')
  const [loading, setLoading] = useState(false)

  const onGenerate = async () => {
    setLoading(true)
    try {
      const blob = await generateReport(type, format, {})
      downloadReportBlob(blob, `${type}-${Date.now()}.${format}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold">Отчёты</h1>
        <p className="text-sm text-slate-500">Генерация выгрузок в нужном формате</p>
      </header>
      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-5 max-w-2xl">
        <div>
          <label className="text-sm font-medium">Тип отчёта</label>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {REPORT_TYPES.map((r) => (
              <button
                key={r.key}
                onClick={() => setType(r.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                  type === r.key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <FileText className="h-4 w-4" /> {r.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Формат</label>
          <div className="mt-2 inline-flex border rounded-lg overflow-hidden">
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-4 py-2 text-sm uppercase font-medium ${format === f ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'}`}
              >{f}</button>
            ))}
          </div>
        </div>
        <button
          onClick={onGenerate} disabled={loading}
          className="h-11 px-5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Download className="h-4 w-4" /> {loading ? 'Генерация…' : 'Сгенерировать и скачать'}
        </button>
      </div>
    </div>
  )
}
