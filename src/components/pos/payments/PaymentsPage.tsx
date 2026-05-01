'use client'
/**
 * /pos/payments — payments ledger with refund management.
 *
 * Surfaces /api/pos/payments (GET + POST refund) which previously had no UI.
 * Lets admins:
 *  - filter payments by date range, method, status
 *  - see KPI strip (total / refunded / by method)
 *  - issue partial or full refunds against any COMPLETED payment
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Banknote,
  CreditCard,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Undo2,
  Wallet,
} from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { formatCurrency } from '@/lib/pos'

type Method = 'CASH' | 'CARD' | 'TRANSFER'

type Status =
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
  status: Status
  processedAt: string
  order?: {
    id: string
    orderNumber: number
    grandTotal?: number
    customer?: { name?: string | null; phone?: string | null } | null
  } | null
}

const METHOD_LABELS: Record<Method, { label: string; tone: string; icon: typeof Banknote }> = {
  CASH: { label: 'Наличные', tone: 'bg-emerald-100 text-emerald-800', icon: Banknote },
  CARD: { label: 'Карта', tone: 'bg-blue-100 text-blue-800', icon: CreditCard },
  TRANSFER: { label: 'Перевод', tone: 'bg-violet-100 text-violet-800', icon: Send },
}

const STATUS_LABELS: Record<Status, { label: string; tone: string }> = {
  PENDING: { label: 'В ожидании', tone: 'bg-slate-100 text-slate-800' },
  COMPLETED: { label: 'Проведён', tone: 'bg-emerald-100 text-emerald-800' },
  FAILED: { label: 'Ошибка', tone: 'bg-rose-100 text-rose-800' },
  REFUNDED: { label: 'Возврат', tone: 'bg-amber-100 text-amber-800' },
  PARTIALLY_REFUNDED: {
    label: 'Частичный возврат',
    tone: 'bg-amber-100 text-amber-800',
  },
  VOIDED: { label: 'Аннулирован', tone: 'bg-slate-100 text-slate-800' },
}

export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filterMethod, setFilterMethod] = useState<'ALL' | Method>('ALL')
  const [filterStatus, setFilterStatus] = useState<'ALL' | Status>('ALL')

  // Refund dialog
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null)
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterMethod !== 'ALL') params.set('method', filterMethod)
      if (filterStatus !== 'ALL') params.set('status', filterStatus)
      params.set('limit', '300')
      const res = await fetch(`/api/pos/payments?${params.toString()}`, {
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
  }, [filterMethod, filterStatus])

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
    let refunded = 0
    let tips = 0
    for (const p of items) {
      const net = p.amount - (p.refundedAmount ?? 0)
      total += net
      tips += p.tip ?? 0
      refunded += p.refundedAmount ?? 0
      if (p.method === 'CASH') cash += net
      else if (p.method === 'CARD') card += net
      else if (p.method === 'TRANSFER') transfer += net
    }
    return { total, cash, card, transfer, refunded, tips, count: items.length }
  }, [items])

  const openRefund = (p: Payment) => {
    if (p.status === 'REFUNDED' || p.status === 'VOIDED' || p.status === 'FAILED') {
      toast('Возврат недоступен для этого платежа')
      return
    }
    const remaining = p.amount - (p.refundedAmount ?? 0)
    setRefundTarget(p)
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
      toast.error('Укажите сумму > 0')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/pos/payments', {
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
      toast.success('Возврат оформлен')
      setRefundOpen(false)
      setRefundTarget(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Платежи"
        icon={<Wallet className="h-4 w-4 text-amber-500" />}
        backHref="/pos/finance"
        badge={items.length}
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            label="Чистая выручка"
            value={formatCurrency(stats.total, 'UZS')}
            icon={<Wallet className="h-4 w-4" />}
            tone="emerald"
            hint="Сумма − возвраты"
          />
          <KpiTile
            label="Наличные"
            value={formatCurrency(stats.cash, 'UZS')}
            icon={<Banknote className="h-4 w-4" />}
            tone="cyan"
            hint="CASH"
          />
          <KpiTile
            label="Карта"
            value={formatCurrency(stats.card, 'UZS')}
            icon={<CreditCard className="h-4 w-4" />}
            tone="indigo"
            hint="CARD"
          />
          <KpiTile
            label="Возвраты"
            value={formatCurrency(stats.refunded, 'UZS')}
            icon={<Undo2 className="h-4 w-4" />}
            tone={stats.refunded > 0 ? 'amber' : 'neutral'}
            hint={`${stats.count} транзакций`}
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
            <div className="flex gap-2">
              <Select
                value={filterMethod}
                onValueChange={(v) => setFilterMethod(v as 'ALL' | Method)}
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Метод" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Любой метод</SelectItem>
                  <SelectItem value="CASH">Наличные</SelectItem>
                  <SelectItem value="CARD">Карта</SelectItem>
                  <SelectItem value="TRANSFER">Перевод</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v as 'ALL' | Status)}
              >
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Любой статус</SelectItem>
                  <SelectItem value="COMPLETED">Проведён</SelectItem>
                  <SelectItem value="PENDING">В ожидании</SelectItem>
                  <SelectItem value="REFUNDED">Возврат</SelectItem>
                  <SelectItem value="PARTIALLY_REFUNDED">
                    Частичный возврат
                  </SelectItem>
                  <SelectItem value="FAILED">Ошибка</SelectItem>
                  <SelectItem value="VOIDED">Аннулирован</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Транзакции ({visible.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="grid place-items-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : visible.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                Платежей не найдено по выбранным фильтрам.
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
                      <th className="px-3 py-2 text-right">Сумма</th>
                      <th className="px-3 py-2 text-right">Возврат</th>
                      <th className="px-3 py-2 text-left">Статус</th>
                      <th className="px-3 py-2 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visible.map((p) => {
                      const m = METHOD_LABELS[p.method]
                      const Icon = m.icon
                      const s = STATUS_LABELS[p.status]
                      const remaining = p.amount - (p.refundedAmount ?? 0)
                      return (
                        <tr key={p.id} className="hover:bg-accent/30">
                          <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                            {new Date(p.processedAt).toLocaleString('ru-RU')}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-mono text-xs">
                              #{p.order?.orderNumber ?? '—'}
                            </div>
                            {p.reference && (
                              <div className="text-[10px] font-mono text-muted-foreground">
                                ref: {p.reference}
                              </div>
                            )}
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
                          <td className="px-3 py-2 text-right font-bold tabular-nums">
                            {formatCurrency(p.amount, 'UZS')}
                            {p.tip > 0 && (
                              <div className="text-[10px] text-muted-foreground">
                                +{formatCurrency(p.tip, 'UZS')} чай
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                            {p.refundedAmount > 0
                              ? formatCurrency(p.refundedAmount, 'UZS')
                              : '—'}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="secondary"
                              className={cn('text-[10px]', s.tone)}
                            >
                              {s.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={
                                remaining <= 0 ||
                                p.status === 'FAILED' ||
                                p.status === 'VOIDED' ||
                                p.status === 'REFUNDED'
                              }
                              onClick={() => openRefund(p)}
                            >
                              <Undo2 className="mr-1 h-3 w-3" />
                              Возврат
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
            <DialogTitle>Оформить возврат</DialogTitle>
            <DialogDescription>
              {refundTarget && (
                <>
                  Платёж #{refundTarget.order?.orderNumber ?? '—'} ·{' '}
                  {METHOD_LABELS[refundTarget.method].label} ·{' '}
                  {formatCurrency(refundTarget.amount, 'UZS')}
                  {refundTarget.refundedAmount > 0 && (
                    <>
                      {' '}
                      · уже возвращено{' '}
                      {formatCurrency(refundTarget.refundedAmount, 'UZS')}
                    </>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Сумма к возврату*</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={refundForm.amount}
                onChange={(e) =>
                  setRefundForm((p) => ({ ...p, amount: e.target.value }))
                }
                placeholder="0"
                className="mt-1"
              />
              {refundTarget && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Максимум:{' '}
                  {formatCurrency(
                    refundTarget.amount - (refundTarget.refundedAmount ?? 0),
                    'UZS'
                  )}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Причина</Label>
              <Textarea
                value={refundForm.reason}
                onChange={(e) =>
                  setRefundForm((p) => ({ ...p, reason: e.target.value }))
                }
                placeholder="Возврат из-за неверного заказа, претензия клиента и т.п."
                className="mt-1 min-h-[64px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submitRefund} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Undo2 className="mr-1 h-4 w-4" />
              )}
              Провести возврат
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
