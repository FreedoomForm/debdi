'use client'
/**
 * Inventory audit page — stock movement ledger.
 *
 * Shows every increment/decrement with reason, source order, performer, and
 * timestamps. Useful for reconciling cash drawer + stock discrepancies and
 * for auditing wastage / corrections.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Boxes,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/pos'

type Movement = {
  id: string
  productId: string
  type:
    | 'SALE'
    | 'PURCHASE'
    | 'RETURN'
    | 'ADJUSTMENT'
    | 'WASTE'
    | 'TRANSFER_IN'
    | 'TRANSFER_OUT'
    | 'PRODUCTION'
  quantity: number
  reason?: string | null
  reference?: string | null
  costPrice?: number | null
  performedBy?: string | null
  createdAt: string
  product: { id: string; name: string; sku?: string | null; unit: string }
}

const TYPE_LABELS: Record<Movement['type'], { label: string; tone: string }> = {
  SALE: { label: 'Продажа', tone: 'bg-rose-100 text-rose-700' },
  PURCHASE: { label: 'Закупка', tone: 'bg-emerald-100 text-emerald-700' },
  RETURN: { label: 'Возврат', tone: 'bg-blue-100 text-blue-700' },
  ADJUSTMENT: { label: 'Коррекция', tone: 'bg-amber-100 text-amber-700' },
  WASTE: { label: 'Списание', tone: 'bg-rose-100 text-rose-700' },
  TRANSFER_IN: { label: 'Перевод (приём)', tone: 'bg-blue-100 text-blue-700' },
  TRANSFER_OUT: {
    label: 'Перевод (отпуск)',
    tone: 'bg-violet-100 text-violet-700',
  },
  PRODUCTION: { label: 'Произв-во', tone: 'bg-indigo-100 text-indigo-700' },
}

export function InventoryPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/inventory/movements?limit=300', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: Movement[] }
      setMovements(data.items ?? [])
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return movements
    return movements.filter(
      (m) =>
        m.product.name.toLowerCase().includes(q) ||
        (m.product.sku ?? '').toLowerCase().includes(q) ||
        (m.reason ?? '').toLowerCase().includes(q)
    )
  }, [movements, query])

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-12 items-center justify-between border-b border-border bg-card px-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/pos/terminal" aria-label="Назад">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Boxes className="h-4 w-4 text-amber-500" />
          <h1 className="text-sm font-semibold">Движения склада</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-[260px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Поиск по товару"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw
              className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')}
            />
            Обновить
          </Button>
        </div>
      </header>

      <main className="px-3 py-3">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Движений пока нет.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Время</th>
                  <th className="px-3 py-2 text-left">Товар</th>
                  <th className="px-3 py-2 text-left">Тип</th>
                  <th className="px-3 py-2 text-right">Количество</th>
                  <th className="px-3 py-2 text-left">Причина</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((m) => {
                  const meta = TYPE_LABELS[m.type]
                  const isOut = m.quantity < 0
                  return (
                    <tr key={m.id} className="hover:bg-accent/30">
                      <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                        {formatDateTime(m.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{m.product.name}</div>
                        {m.product.sku && (
                          <div className="text-[11px] font-mono text-muted-foreground">
                            {m.product.sku}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px]', meta.tone)}
                        >
                          {meta.label}
                        </Badge>
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2 text-right tabular-nums font-semibold',
                          isOut ? 'text-rose-600' : 'text-emerald-600'
                        )}
                      >
                        <span className="inline-flex items-center gap-0.5">
                          {isOut ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUp className="h-3 w-3" />
                          )}
                          {Math.abs(m.quantity)} {m.product.unit}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {m.reason ?? '—'}
                        {m.reference && (
                          <div className="font-mono text-[10px] opacity-70">
                            ref: {m.reference.slice(-8)}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
