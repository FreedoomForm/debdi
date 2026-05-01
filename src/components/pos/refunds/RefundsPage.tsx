'use client'
/**
 * /pos/refunds — dedicated refunds audit page.
 *
 * Surfaces every payment that has been fully or partially refunded so
 * managers can audit returns at a glance. Reuses /api/pos/payments
 * with status=REFUNDED + status=PARTIALLY_REFUNDED filtering. Adds:
 *   - KPI strip: total refunded amount, count, by-method breakdown
 *   - Filters: date range (today/7d/30d/all), method
 *   - Per-row link back to /pos/payments for re-issuing additional refunds
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Banknote,
  CreditCard,
  ExternalLink,
  Loader2,
  Search,
  Send,
  Undo2,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { formatCurrency } from '@/lib/pos'

type Method = 'CASH' | 'CARD' | 'TRANSFER'

type Payment = {
  id: string
  orderId: string
  method: Method
  amount: number
  refundedAmount: number
  status: string
  processedAt: string
  reference?: string | null
  order?: {
    id: string
    orderNumber: number
    customer?: { name?: string | null; phone?: string | null } | null
  } | null
}

type Window = 'today' | '7d' | '30d' | 'all'

const METHOD_META: Record<
  Method,
  { label: string; tone: string; icon: typeof Banknote }
> = {
  CASH: {
    label: 'Наличные',
    tone: 'bg-emerald-100 text-emerald-800',
    icon: Banknote,
  },
  CARD: { label: 'Карта', tone: 'bg-blue-100 text-blue-800', icon: CreditCard },
  TRANSFER: {
    label: 'Перевод',
    tone: 'bg-violet-100 text-violet-800',
    icon: Send,
  },
}

const WINDOW_LABELS: Record<Window, string> = {
  today: 'Сегодня',
  '7d': '7 дней',
  '30d': '30 дней',
  all: 'Всё время',
}

function windowToFrom(w: Window): Date | null {
  const now = new Date()
  if (w === 'all') return null
  if (w === 'today') {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (w === '7d') return new Date(now.getTime() - 7 * 86_400_000)
  if (w === '30d') return new Date(now.getTime() - 30 * 86_400_000)
  return null
}

export default function RefundsPage() {
  const [items, setItems] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filterMethod, setFilterMethod] = useState<'ALL' | Method>('ALL')
  const [windowKey, setWindowKey] = useState<Window>('30d')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch refunded + partially refunded in parallel.
      const params1 = new URLSearchParams({ status: 'REFUNDED', limit: '300' })
      const params2 = new URLSearchParams({
        status: 'PARTIALLY_REFUNDED',
        limit: '300',
      })
      if (filterMethod !== 'ALL') {
        params1.set('method', filterMethod)
        params2.set('method', filterMethod)
      }
      const from = windowToFrom(windowKey)
      if (from) {
        params1.set('from', from.toISOString())
        params2.set('from', from.toISOString())
      }
      const [r1, r2] = await Promise.all([
        fetch(`/api/pos/payments?${params1.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch(`/api/pos/payments?${params2.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
        }),
      ])
      const d1 = r1.ok
        ? ((await r1.json()) as { items?: Payment[] }).items ?? []
        : []
      const d2 = r2.ok
        ? ((await r2.json()) as { items?: Payment[] }).items ?? []
        : []
      const merged = [...d1, ...d2]
        .filter((p) => (p.refundedAmount ?? 0) > 0)
        .sort(
          (a, b) =>
            new Date(b.processedAt).getTime() -
            new Date(a.processedAt).getTime()
        )
      setItems(merged)
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить'
      )
    } finally {
      setLoading(false)
    }
  }, [filterMethod, windowKey])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    if (!query.trim()) return items
    const q = query.trim().toLowerCase()
    return items.filter(
      (p) =>
        String(p.order?.orderNumber ?? '').includes(q) ||
        (p.reference ?? '').toLowerCase().includes(q) ||
        (p.order?.customer?.name ?? '').toLowerCase().includes(q) ||
        (p.order?.customer?.phone ?? '').toLowerCase().includes(q)
    )
  }, [items, query])

  const stats = useMemo(() => {
    let total = 0
    let cash = 0
    let card = 0
    let transfer = 0
    let fullCount = 0
    let partialCount = 0
    for (const p of items) {
      total += p.refundedAmount ?? 0
      if (p.method === 'CASH') cash += p.refundedAmount ?? 0
      if (p.method === 'CARD') card += p.refundedAmount ?? 0
      if (p.method === 'TRANSFER') transfer += p.refundedAmount ?? 0
      if (p.status === 'REFUNDED') fullCount += 1
      if (p.status === 'PARTIALLY_REFUNDED') partialCount += 1
    }
    return {
      total,
      cash,
      card,
      transfer,
      count: items.length,
      fullCount,
      partialCount,
    }
  }, [items])

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Возвраты"
        icon={<Undo2 className="h-4 w-4 text-amber-500" />}
        backHref="/pos/payments"
        badge={items.length}
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            label="Сумма возвратов"
            value={formatCurrency(stats.total, 'UZS')}
            icon={<Undo2 className="h-4 w-4" />}
            tone={stats.total > 0 ? 'amber' : 'neutral'}
            hint={`${stats.count} транзакций`}
          />
          <KpiTile
            label="Полные"
            value={String(stats.fullCount)}
            icon={<Undo2 className="h-4 w-4" />}
            tone="rose"
            hint="REFUNDED"
          />
          <KpiTile
            label="Частичные"
            value={String(stats.partialCount)}
            icon={<Undo2 className="h-4 w-4" />}
            tone="amber"
            hint="PARTIALLY_REFUNDED"
          />
          <KpiTile
            label="Процент возвратов"
            value={
              stats.count + stats.fullCount > 0
                ? `${Math.round(
                    (stats.fullCount / Math.max(stats.count, 1)) * 100
                  )}%`
                : '0%'
            }
            icon={<Wallet className="h-4 w-4" />}
            tone="violet"
            hint="full / total"
          />
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-end gap-2 p-3">
            <div className="relative w-full sm:w-[260px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Поиск по № заказа / клиенту"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <Select
              value={windowKey}
              onValueChange={(v) => setWindowKey(v as Window)}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['today', '7d', '30d', 'all'] as Window[]).map((w) => (
                  <SelectItem key={w} value={w}>
                    {WINDOW_LABELS[w]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterMethod}
              onValueChange={(v) => setFilterMethod(v as 'ALL' | Method)}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Любой метод</SelectItem>
                <SelectItem value="CASH">Наличные</SelectItem>
                <SelectItem value="CARD">Карта</SelectItem>
                <SelectItem value="TRANSFER">Перевод</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Список возвратов ({visible.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="grid place-items-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : visible.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                Возвратов в выбранном периоде не найдено.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Время</th>
                      <th className="px-3 py-2 text-left">Заказ</th>
                      <th className="px-3 py-2 text-left">Клиент</th>
                      <th className="px-3 py-2 text-left">Метод</th>
                      <th className="px-3 py-2 text-right">Сумма платежа</th>
                      <th className="px-3 py-2 text-right">Возвращено</th>
                      <th className="px-3 py-2 text-left">Тип</th>
                      <th className="px-3 py-2 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visible.map((p) => {
                      const m = METHOD_META[p.method]
                      const Icon = m.icon
                      const fullRefund = p.status === 'REFUNDED'
                      return (
                        <tr key={p.id} className="hover:bg-accent/30">
                          <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                            {new Date(p.processedAt).toLocaleString('ru-RU')}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-mono text-xs">
                              #{p.order?.orderNumber ?? '—'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {p.order?.customer?.name ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {p.order?.customer?.phone && (
                              <div className="text-[10px] text-muted-foreground">
                                {p.order.customer.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="secondary"
                              className={cn('text-[10px]', m.tone)}
                            >
                              <Icon className="mr-1 h-3 w-3" />
                              {m.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatCurrency(p.amount, 'UZS')}
                          </td>
                          <td className="px-3 py-2 text-right font-bold tabular-nums text-amber-700">
                            {formatCurrency(p.refundedAmount, 'UZS')}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[10px]',
                                fullRefund
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              )}
                            >
                              {fullRefund ? 'Полный' : 'Частичный'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                            >
                              <Link href={`/pos/payments?focus=${p.id}`}>
                                <ExternalLink className="mr-1 h-3 w-3" />
                                Открыть
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
