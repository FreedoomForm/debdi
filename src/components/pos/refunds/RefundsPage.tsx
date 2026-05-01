'use client'
/**
 * /pos/refunds — refund management page.
 *
 * Surfaces /api/pos/refunds (GET + POST) — a new endpoint that aggregates
 * Payment rows where status is REFUNDED / PARTIALLY_REFUNDED or
 * refundedAmount > 0. Lets admins view all refunds with KPI strip and
 * issue new refunds (full or partial) on any Payment via order lookup.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Banknote,
  CreditCard,
  Filter,
  Landmark,
  Loader2,
  Receipt,
  RotateCcw,
  Search,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { formatCurrency } from '@/lib/pos'

type Method = 'CASH' | 'CARD' | 'TRANSFER'
type TxnStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'VOIDED'

type Payment = {
  id: string
  orderId: string
  method: Method
  amount: number
  tip: number
  changeGiven: number
  reference?: string | null
  refundedAmount: number
  status: TxnStatus
  processedAt: string
  order?: {
    id: string
    orderNumber: number
    paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL'
    orderStatus: string
    grandTotal: number
    customer?: { id: string; name: string; phone: string } | null
  } | null
}

const METHOD_META: Record<Method, { label: string; tone: string; icon: typeof Banknote }> = {
  CASH: { label: 'Наличные', tone: 'bg-emerald-100 text-emerald-800', icon: Banknote },
  CARD: { label: 'Карта', tone: 'bg-blue-100 text-blue-800', icon: CreditCard },
  TRANSFER: { label: 'Перевод', tone: 'bg-violet-100 text-violet-800', icon: Landmark },
}

const STATUS_META: Record<TxnStatus, { label: string; tone: string }> = {
  PENDING: { label: 'Ожидает', tone: 'bg-amber-100 text-amber-800' },
  COMPLETED: { label: 'Завершён', tone: 'bg-emerald-100 text-emerald-800' },
  FAILED: { label: 'Ошибка', tone: 'bg-rose-100 text-rose-800' },
  REFUNDED: { label: 'Возврат', tone: 'bg-rose-100 text-rose-800' },
  PARTIALLY_REFUNDED: {
    label: 'Частичный возврат',
    tone: 'bg-amber-100 text-amber-800',
  },
  VOIDED: { label: 'Аннулирован', tone: 'bg-slate-100 text-slate-800' },
}

function isoDay(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export default function RefundsPage() {
  const [items, setItems] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState<string>(() => isoDay(-30))
  const [to, setTo] = useState<string>(() => isoDay(0))
  const [query, setQuery] = useState('')

  // Refund dialog state
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null)
  const [refundForm, setRefundForm] = useState<{ amount: string; reason: string }>({
    amount: '',
    reason: '',
  })
  const [busy, setBusy] = useState(false)

  // Order lookup for issuing fresh refunds
  const [lookupQuery, setLookupQuery] = useState('')
  const [lookupResults, setLookupResults] = useState<Payment[]>([])
  const [lookupLoading, setLookupLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', new Date(from + 'T00:00:00').toISOString())
      if (to) params.set('to', new Date(to + 'T23:59:59').toISOString())
      const res = await fetch(`/api/pos/refunds?${params}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: Payment[] }
      setItems(data.items ?? [])
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить'
      )
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items
    const q = query.trim().toLowerCase()
    return items.filter(
      (p) =>
        String(p.order?.orderNumber ?? '').includes(q) ||
        (p.order?.customer?.name ?? '').toLowerCase().includes(q) ||
        (p.order?.customer?.phone ?? '').toLowerCase().includes(q) ||
        (p.reference ?? '').toLowerCase().includes(q)
    )
  }, [items, query])

  const stats = useMemo(() => {
    let total = 0
    let count = 0
    let full = 0
    let partial = 0
    let cashRefund = 0
    let cardRefund = 0
    let transferRefund = 0
    for (const p of filteredItems) {
      total += p.refundedAmount
      count += 1
      if (p.status === 'REFUNDED') full += 1
      else if (p.status === 'PARTIALLY_REFUNDED') partial += 1
      if (p.method === 'CASH') cashRefund += p.refundedAmount
      else if (p.method === 'CARD') cardRefund += p.refundedAmount
      else if (p.method === 'TRANSFER') transferRefund += p.refundedAmount
    }
    return { total, count, full, partial, cashRefund, cardRefund, transferRefund }
  }, [filteredItems])

  const lookupPayments = async () => {
    if (!lookupQuery.trim()) {
      toast.error('Введите № заказа или имя клиента')
      return
    }
    setLookupLoading(true)
    try {
      // Re-use the payments endpoint with no method filter, then filter client-side.
      const res = await fetch('/api/pos/payments?limit=300', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: Payment[] }
      const q = lookupQuery.trim().toLowerCase()
      const found =
        (data.items ?? []).filter(
          (p) =>
            String(p.order?.orderNumber ?? '').includes(q) ||
            (p.order?.customer?.name ?? '').toLowerCase().includes(q) ||
            (p.order?.customer?.phone ?? '').toLowerCase().includes(q)
        ) ?? []
      setLookupResults(found.slice(0, 25))
      if (found.length === 0) toast.info('Нет совпадений')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setLookupLoading(false)
    }
  }

  const openRefund = (payment: Payment) => {
    const remaining = payment.amount - payment.refundedAmount
    setRefundTarget(payment)
    setRefundForm({
      amount: remaining > 0 ? String(remaining) : '',
      reason: '',
    })
    setRefundOpen(true)
  }

  const submitRefund = async () => {
    if (!refundTarget) return
    const amt = Number(refundForm.amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Введите сумму > 0')
      return
    }
    const remaining = refundTarget.amount - refundTarget.refundedAmount
    if (amt > remaining + 0.001) {
      toast.error(`Максимум: ${remaining.toFixed(2)}`)
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/pos/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          paymentId: refundTarget.id,
          amount: amt,
          reason: refundForm.reason.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success('Возврат проведён')
      setRefundOpen(false)
      setRefundTarget(null)
      setRefundForm({ amount: '', reason: '' })
      await load()
      // refresh lookup if still open
      if (lookupResults.length > 0) {
        await lookupPayments()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Возвраты"
        icon={<RotateCcw className="h-4 w-4 text-rose-500" />}
        backHref="/pos/payments"
        badge={stats.count}
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            label="Сумма возвратов"
            value={formatCurrency(stats.total, 'UZS')}
            icon={<TrendingDown className="h-4 w-4" />}
            tone={stats.total > 0 ? 'rose' : 'neutral'}
            hint={`${stats.count} операций`}
          />
          <KpiTile
            label="Полных"
            value={String(stats.full)}
            icon={<RotateCcw className="h-4 w-4" />}
            tone={stats.full > 0 ? 'rose' : 'neutral'}
            hint="REFUNDED"
          />
          <KpiTile
            label="Частичных"
            value={String(stats.partial)}
            icon={<Filter className="h-4 w-4" />}
            tone={stats.partial > 0 ? 'amber' : 'neutral'}
            hint="PARTIALLY_REFUNDED"
          />
          <KpiTile
            label="Налом возврат"
            value={formatCurrency(stats.cashRefund, 'UZS')}
            icon={<Banknote className="h-4 w-4" />}
            tone="emerald"
            hint="Из кассы"
          />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4" />
              Новый возврат
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[260px]">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Поиск платежа (№ заказа, имя, телефон)
                </Label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') lookupPayments()
                    }}
                    className="h-9 pl-9"
                    placeholder="напр. 1024 или Иван"
                  />
                </div>
              </div>
              <Button onClick={lookupPayments} disabled={lookupLoading}>
                {lookupLoading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-1.5 h-4 w-4" />
                )}
                Найти
              </Button>
            </div>

            {lookupResults.length > 0 && (
              <ul className="divide-y divide-border rounded-md border border-border">
                {lookupResults.map((p) => {
                  const meta = METHOD_META[p.method]
                  const remaining = p.amount - p.refundedAmount
                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 p-2 hover:bg-accent/30"
                    >
                      <div
                        className={cn(
                          'grid h-8 w-8 place-items-center rounded-md',
                          meta.tone
                        )}
                      >
                        <meta.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">
                          #{p.order?.orderNumber ?? '—'}{' '}
                          <span className="text-muted-foreground">
                            · {p.order?.customer?.name ?? 'Без клиента'}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {meta.label} ·{' '}
                          {new Date(p.processedAt).toLocaleDateString('ru-RU')}
                          {p.refundedAmount > 0 &&
                            ` · уже возвращено ${formatCurrency(p.refundedAmount, 'UZS')}`}
                        </div>
                      </div>
                      <div className="text-right text-sm font-bold tabular-nums">
                        {formatCurrency(p.amount, 'UZS')}
                        <div className="text-[11px] font-normal text-muted-foreground">
                          доступно: {formatCurrency(Math.max(remaining, 0), 'UZS')}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={remaining <= 0.001}
                        onClick={() => openRefund(p)}
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Вернуть
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              История возвратов ({filteredItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  С
                </Label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  По
                </Label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Поиск
                </Label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="№ заказа, имя, телефон, реф."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-9 pl-9"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid place-items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                За период возвратов нет.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Время</th>
                      <th className="px-3 py-2 text-left">Заказ</th>
                      <th className="px-3 py-2 text-left">Клиент</th>
                      <th className="px-3 py-2 text-left">Метод</th>
                      <th className="px-3 py-2 text-left">Статус</th>
                      <th className="px-3 py-2 text-right">Возвращено</th>
                      <th className="px-3 py-2 text-right">Сумма</th>
                      <th className="px-3 py-2 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredItems.map((p) => {
                      const meta = METHOD_META[p.method]
                      const status = STATUS_META[p.status]
                      const remaining = p.amount - p.refundedAmount
                      return (
                        <tr key={p.id} className="hover:bg-accent/30">
                          <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                            {new Date(p.processedAt).toLocaleString('ru-RU')}
                          </td>
                          <td className="px-3 py-2">
                            {p.order ? (
                              <Link
                                href={`/pos/orders?focus=${p.orderId}`}
                                className="font-mono text-xs text-primary hover:underline"
                              >
                                #{p.order.orderNumber}
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {p.order?.customer ? (
                              <>
                                <div>{p.order.customer.name}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {p.order.customer.phone}
                                </div>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="secondary"
                              className={cn('text-[10px]', meta.tone)}
                            >
                              <meta.icon className="mr-1 h-3 w-3" />
                              {meta.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="secondary"
                              className={cn('text-[10px]', status.tone)}
                            >
                              {status.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums text-rose-700">
                            {formatCurrency(p.refundedAmount, 'UZS')}
                          </td>
                          <td className="px-3 py-2 text-right font-bold tabular-nums">
                            {formatCurrency(p.amount, 'UZS')}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={remaining <= 0.001}
                              onClick={() => openRefund(p)}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              {remaining > 0.001 ? 'Доп. возврат' : 'Полн. возврат'}
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

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Оформление возврата</DialogTitle>
            <DialogDescription>
              {refundTarget?.order
                ? `Заказ #${refundTarget.order.orderNumber}`
                : 'Платёж'}
              {' · '}
              {refundTarget &&
                `${formatCurrency(refundTarget.amount, 'UZS')} (${
                  METHOD_META[refundTarget.method].label
                })`}
            </DialogDescription>
          </DialogHeader>

          {refundTarget && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Сумма к возврату*</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={refundForm.amount}
                  onChange={(e) =>
                    setRefundForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  className="mt-1"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Доступно:{' '}
                  {formatCurrency(
                    Math.max(refundTarget.amount - refundTarget.refundedAmount, 0),
                    'UZS'
                  )}
                </p>
              </div>
              <div>
                <Label className="text-xs">Уже возвращено</Label>
                <div className="mt-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm tabular-nums">
                  {formatCurrency(refundTarget.refundedAmount, 'UZS')}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Причина возврата</Label>
                <Textarea
                  value={refundForm.reason}
                  onChange={(e) =>
                    setRefundForm((p) => ({ ...p, reason: e.target.value }))
                  }
                  placeholder="Например: брак товара, отказ клиента, ошибка кассира"
                  className="mt-1 min-h-[80px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submitRefund} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-1 h-4 w-4" />
              )}
              Провести возврат
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
