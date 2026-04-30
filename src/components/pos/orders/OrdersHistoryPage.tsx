'use client'
/**
 * Orders history / journal page.
 *
 * Lists recent POS orders with quick filters and a side drawer that reveals
 * full details on click — items, payments, receipt links, and a "Refund"
 * launcher for completed orders.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Printer,
  RefreshCw,
  Receipt as ReceiptIcon,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDateTime, formatTime } from '@/lib/pos'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'

type OrderItem = {
  id: string
  name: string
  quantity: number
  unitPrice: number
  total: number
  notes?: string | null
}

type Payment = {
  id: string
  method: 'CASH' | 'CARD' | 'TRANSFER'
  amount: number
  reference?: string | null
  status: string
  refundedAmount: number
  processedAt: string
}

type Receipt = {
  id: string
  receiptNumber: string
  printedAt?: string | null
  type: string
}

type Order = {
  id: string
  orderNumber: number
  orderStatus: string
  paymentStatus: string
  serviceMode?: string | null
  grandTotal: number
  subtotal: number
  discountTotal: number
  taxTotal: number
  tipTotal: number
  notes?: string | null
  createdAt: string
  customer?: { id: string; name: string; phone: string } | null
  items: OrderItem[]
  payments: Payment[]
  receipts?: Receipt[]
}

const STATUS_TONE: Record<string, string> = {
  NEW: 'bg-amber-100 text-amber-700',
  PENDING: 'bg-amber-100 text-amber-700',
  IN_PROCESS: 'bg-blue-100 text-blue-700',
  IN_DELIVERY: 'bg-indigo-100 text-indigo-700',
  PAUSED: 'bg-slate-100 text-slate-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELED: 'bg-rose-100 text-rose-700',
  FAILED: 'bg-rose-100 text-rose-700',
}

const PAY_TONE: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  UNPAID: 'bg-slate-100 text-slate-700',
}

type SourceMode = 'pos' | 'delivery' | 'all'

export function OrdersHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'today'>(
    'all'
  )
  const [source, setSource] = useState<SourceMode>('pos')
  const [selected, setSelected] = useState<Order | null>(null)
  const [refunding, setRefunding] = useState(false)

  // Normalize a legacy delivery /api/orders row into the unified Order shape
  // so the new UI can render both feeds side by side without redirects to the
  // old /middle-admin?tab=orders page.
  const adaptDeliveryOrder = (raw: Record<string, unknown>): Order => {
    const items = Array.isArray(raw.items)
      ? (raw.items as Array<Record<string, unknown>>).map((it, i) => ({
          id: String(it.id ?? `${raw.id}-it-${i}`),
          name: String(it.name ?? it.title ?? 'Позиция'),
          quantity: Number(it.quantity ?? it.qty ?? 1),
          unitPrice: Number(it.unitPrice ?? it.price ?? 0),
          total: Number(it.total ?? it.lineTotal ?? Number(it.unitPrice ?? 0) * Number(it.quantity ?? 1)),
          notes: (it.notes as string) ?? null,
        }))
      : []
    const customer = raw.customer as Record<string, unknown> | undefined
    return {
      id: String(raw.id),
      orderNumber: Number(raw.orderNumber ?? raw.number ?? 0),
      orderStatus: String(raw.status ?? raw.orderStatus ?? 'PENDING'),
      paymentStatus: String(raw.paymentStatus ?? (raw.isPaid ? 'PAID' : 'UNPAID')),
      serviceMode: 'DELIVERY',
      grandTotal: Number(raw.total ?? raw.grandTotal ?? 0),
      subtotal: Number(raw.subtotal ?? raw.total ?? 0),
      discountTotal: Number(raw.discount ?? raw.discountTotal ?? 0),
      taxTotal: Number(raw.tax ?? raw.taxTotal ?? 0),
      tipTotal: Number(raw.tip ?? raw.tipTotal ?? 0),
      notes: (raw.notes as string) ?? null,
      createdAt: String(raw.createdAt ?? new Date().toISOString()),
      customer: customer
        ? {
            id: String(customer.id ?? ''),
            name: String(customer.name ?? ''),
            phone: String(customer.phone ?? ''),
          }
        : null,
      items,
      payments: [],
      receipts: [],
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const tasks: Array<Promise<Order[]>> = []
      if (source === 'pos' || source === 'all') {
        tasks.push(
          fetch('/api/pos/orders?limit=100', { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : { items: [] }))
            .then((d: { items?: Order[] }) => d.items ?? [])
            .catch(() => [])
        )
      }
      if (source === 'delivery' || source === 'all') {
        tasks.push(
          fetch('/api/orders?limit=100', { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : []))
            .then((d) => {
              const arr = Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : []
              return (arr as Array<Record<string, unknown>>).map(adaptDeliveryOrder)
            })
            .catch(() => [])
        )
      }
      const results = await Promise.all(tasks)
      const merged = results.flat().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setOrders(merged)
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить'
      )
    } finally {
      setLoading(false)
    }
  }, [source])

  useEffect(() => {
    load()
  }, [load, source])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return orders
      .filter((o) => {
        if (filter === 'paid' && o.paymentStatus !== 'PAID') return false
        if (filter === 'unpaid' && o.paymentStatus === 'PAID') return false
        if (filter === 'today') {
          const t = new Date(o.createdAt)
          if (t < today) return false
        }
        return true
      })
      .filter((o) => {
        if (!q) return true
        return (
          String(o.orderNumber).includes(q) ||
          (o.customer?.name ?? '').toLowerCase().includes(q) ||
          (o.customer?.phone ?? '').includes(q)
        )
      })
  }, [orders, query, filter])

  const refundFull = async (order: Order) => {
    if (!confirm(`Вернуть ${formatCurrency(order.grandTotal, 'UZS')} полностью?`))
      return
    setRefunding(true)
    try {
      const res = await fetch(`/api/pos/orders/${order.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: order.grandTotal,
          method: order.payments[0]?.method ?? 'CASH',
          reason: 'Полный возврат',
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Возврат оформлен')
      setSelected(null)
      load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось'
      )
    } finally {
      setRefunding(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Журнал заказов"
        icon={<ReceiptIcon className="h-4 w-4 text-amber-500" />}
        backHref="/pos/terminal"
        badge={visible.length}
        actions={
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
            Обновить
          </Button>
        }
      />

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Поиск по №, имени, телефону"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        {(['all', 'today', 'paid', 'unpaid'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition',
              filter === f
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-card text-muted-foreground hover:bg-accent'
            )}
          >
            {f === 'all'
              ? 'Все'
              : f === 'today'
                ? 'Сегодня'
                : f === 'paid'
                  ? 'Оплаченные'
                  : 'Неоплаченные'}
          </button>
        ))}
        <div className="ml-auto inline-flex rounded-md border border-border p-0.5">
          {(['pos', 'delivery', 'all'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition',
                source === s
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-accent'
              )}
            >
              {s === 'pos' ? 'Касса' : s === 'delivery' ? 'Доставка' : 'Все источники'}
            </button>
          ))}
        </div>
      </div>

      <main className="px-3 py-3">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Заказов пока нет</CardTitle>
            </CardHeader>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-20 px-3 py-2 text-left">№</th>
                  <th className="px-3 py-2 text-left">Время</th>
                  <th className="px-3 py-2 text-left">Клиент</th>
                  <th className="px-3 py-2 text-left">Статус</th>
                  <th className="px-3 py-2 text-left">Оплата</th>
                  <th className="px-3 py-2 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelected(o)}
                    className="cursor-pointer hover:bg-accent/40"
                  >
                    <td className="px-3 py-2 font-bold tabular-nums">
                      #{o.orderNumber}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs">
                        {formatTime(o.createdAt)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDateTime(o.createdAt).split(',')[0]}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {o.customer?.name ?? '—'}
                      {o.customer?.phone && (
                        <div className="text-[11px] text-muted-foreground">
                          {o.customer.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px]',
                          STATUS_TONE[o.orderStatus] ?? 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {o.orderStatus}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px]',
                          PAY_TONE[o.paymentStatus] ?? 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {o.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatCurrency(o.grandTotal, 'UZS')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Detail drawer */}
      <Sheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px]">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  Заказ #{selected.orderNumber}
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px]',
                      STATUS_TONE[selected.orderStatus]
                    )}
                  >
                    {selected.orderStatus}
                  </Badge>
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="-mx-1 mt-3 h-[calc(100vh-9rem)] px-1">
                <div className="space-y-4">
                  <div className="rounded-lg bg-secondary/40 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Создан</span>
                      <span>{formatDateTime(selected.createdAt)}</span>
                    </div>
                    {selected.customer && (
                      <div className="mt-2">
                        <div className="font-medium">
                          {selected.customer.name}
                        </div>
                        <div className="text-muted-foreground">
                          {selected.customer.phone}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Позиции
                    </div>
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {selected.items.map((it) => (
                        <li
                          key={it.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">
                              {it.quantity > 1 && `${it.quantity} × `}
                              {it.name}
                            </div>
                            {it.notes && (
                              <div className="text-[11px] italic text-muted-foreground">
                                {it.notes}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xs tabular-nums">
                              {formatCurrency(it.total, 'UZS')}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Итоги
                    </div>
                    <dl className="space-y-1 rounded-lg border border-border bg-card p-3 text-sm">
                      <Row
                        label="Подытог"
                        value={formatCurrency(selected.subtotal, 'UZS')}
                      />
                      {selected.discountTotal > 0 && (
                        <Row
                          label="Скидка"
                          value={`-${formatCurrency(selected.discountTotal, 'UZS')}`}
                        />
                      )}
                      {selected.taxTotal > 0 && (
                        <Row
                          label="Налог"
                          value={formatCurrency(selected.taxTotal, 'UZS')}
                        />
                      )}
                      {selected.tipTotal > 0 && (
                        <Row
                          label="Чаевые"
                          value={formatCurrency(selected.tipTotal, 'UZS')}
                        />
                      )}
                      <div className="flex items-baseline justify-between border-t border-border pt-1">
                        <dt className="font-semibold">Итого</dt>
                        <dd className="text-base font-bold tabular-nums">
                          {formatCurrency(selected.grandTotal, 'UZS')}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {selected.payments.length > 0 && (
                    <div>
                      <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                        Платежи
                      </div>
                      <ul className="divide-y divide-border rounded-lg border border-border">
                        {selected.payments.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between px-3 py-1.5 text-sm"
                          >
                            <div className="flex items-center gap-1.5">
                              {p.method === 'CASH' && '💵'}
                              {p.method === 'CARD' && (
                                <CreditCard className="h-3.5 w-3.5" />
                              )}
                              <span>
                                {p.method === 'CASH'
                                  ? 'Наличные'
                                  : p.method === 'CARD'
                                    ? 'Карта'
                                    : 'Перевод'}
                              </span>
                              {p.reference && (
                                <span className="text-[10px] text-muted-foreground">
                                  · {p.reference}
                                </span>
                              )}
                              {p.status === 'REFUNDED' && (
                                <Badge
                                  variant="secondary"
                                  className="bg-rose-100 text-rose-700 text-[9px]"
                                >
                                  Возврат
                                </Badge>
                              )}
                            </div>
                            <span
                              className={cn(
                                'tabular-nums',
                                p.amount < 0 && 'text-rose-600 font-semibold'
                              )}
                            >
                              {formatCurrency(p.amount, 'UZS')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {selected.receipts && selected.receipts.length > 0 && (
                      <a
                        href={`/api/pos/receipts/${selected.receipts[0].receiptNumber}/print`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-accent"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Перепечатать чек
                      </a>
                    )}
                    {selected.paymentStatus === 'PAID' &&
                      selected.orderStatus !== 'CANCELED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={refunding}
                          onClick={() => refundFull(selected)}
                          className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-700"
                        >
                          {refunding ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Возврат
                        </Button>
                      )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
