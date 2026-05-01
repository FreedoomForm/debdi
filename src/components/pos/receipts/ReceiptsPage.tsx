'use client'
/**
 * /pos/receipts — receipts ledger with print + send actions.
 *
 * Surfaces /api/pos/receipts (GET) plus the existing print/send endpoints:
 *   • GET  /api/pos/receipts/:n/print  → opens printable HTML in new tab
 *   • POST /api/pos/receipts/:n/send   → emails / SMS receipt to customer
 *
 * Includes KPI strip, type filter, format filter, search and per-row
 * actions for re-print and re-send.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Printer,
  Receipt as ReceiptIcon,
  Search,
  Send,
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
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { formatCurrency } from '@/lib/pos'

type RType = 'SALE' | 'REFUND' | 'VOID'
type RFormat = '80mm' | '58mm' | 'A4' | 'EMAIL'

type Receipt = {
  id: string
  receiptNumber: string
  type: RType
  format: string
  printedAt?: string | null
  emailedTo?: string | null
  smsTo?: string | null
  createdAt: string
  order?: {
    id: string
    orderNumber: number
    grandTotal?: number
    customer?: { name?: string | null; phone?: string | null } | null
  } | null
}

const TYPE_LABELS: Record<RType, { label: string; tone: string }> = {
  SALE: { label: 'Продажа', tone: 'bg-emerald-100 text-emerald-800' },
  REFUND: { label: 'Возврат', tone: 'bg-amber-100 text-amber-800' },
  VOID: { label: 'Аннуляция', tone: 'bg-rose-100 text-rose-800' },
}

export default function ReceiptsPage() {
  const [items, setItems] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | RType>('ALL')
  const [filterFormat, setFilterFormat] = useState<'ALL' | RFormat>('ALL')

  // Send dialog
  const [sendOpen, setSendOpen] = useState(false)
  const [sendTarget, setSendTarget] = useState<Receipt | null>(null)
  const [sendForm, setSendForm] = useState({ email: '', phone: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType !== 'ALL') params.set('type', filterType)
      if (filterFormat !== 'ALL') params.set('format', filterFormat)
      params.set('limit', '300')
      const res = await fetch(`/api/pos/receipts?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: Receipt[] }
      setItems(data.items ?? [])
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить'
      )
    } finally {
      setLoading(false)
    }
  }, [filterType, filterFormat])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    if (!query.trim()) return items
    const q = query.trim().toLowerCase()
    return items.filter(
      (r) =>
        r.receiptNumber.toLowerCase().includes(q) ||
        String(r.order?.orderNumber ?? '').includes(q) ||
        (r.order?.customer?.name ?? '').toLowerCase().includes(q) ||
        (r.order?.customer?.phone ?? '').toLowerCase().includes(q)
    )
  }, [items, query])

  const stats = useMemo(() => {
    let total = 0
    let printed = 0
    let emailed = 0
    let texted = 0
    for (const r of items) {
      total += r.order?.grandTotal ?? 0
      if (r.printedAt) printed += 1
      if (r.emailedTo) emailed += 1
      if (r.smsTo) texted += 1
    }
    return {
      count: items.length,
      total,
      printed,
      emailed,
      texted,
    }
  }, [items])

  const reprint = (r: Receipt) => {
    window.open(`/api/pos/receipts/${r.receiptNumber}/print`, '_blank')
  }

  const openSend = (r: Receipt) => {
    setSendTarget(r)
    setSendForm({
      email: r.emailedTo ?? '',
      phone: r.smsTo ?? r.order?.customer?.phone ?? '',
    })
    setSendOpen(true)
  }

  const submitSend = async () => {
    if (!sendTarget) return
    if (!sendForm.email.trim() && !sendForm.phone.trim()) {
      toast.error('Укажите email или телефон')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(
        `/api/pos/receipts/${sendTarget.receiptNumber}/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: sendForm.email.trim() || undefined,
            phone: sendForm.phone.trim() || undefined,
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success('Чек отправлен')
      setSendOpen(false)
      setSendTarget(null)
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
        title="Чеки"
        icon={<ReceiptIcon className="h-4 w-4 text-amber-500" />}
        backHref="/pos/orders"
        badge={items.length}
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            label="Чеков"
            value={String(stats.count)}
            icon={<ReceiptIcon className="h-4 w-4" />}
            tone="neutral"
            hint="Последние 300"
          />
          <KpiTile
            label="Распечатано"
            value={String(stats.printed)}
            icon={<Printer className="h-4 w-4" />}
            tone="cyan"
            hint="С отметкой printedAt"
          />
          <KpiTile
            label="Отправлено email"
            value={String(stats.emailed)}
            icon={<Mail className="h-4 w-4" />}
            tone="indigo"
            hint="emailedTo"
          />
          <KpiTile
            label="Отправлено SMS"
            value={String(stats.texted)}
            icon={<MessageSquare className="h-4 w-4" />}
            tone="violet"
            hint="smsTo"
          />
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-end gap-2 p-3">
            <div className="relative w-full sm:w-[260px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Номер чека / заказа / клиент"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <Select
              value={filterType}
              onValueChange={(v) => setFilterType(v as 'ALL' | RType)}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Любой тип</SelectItem>
                <SelectItem value="SALE">Продажа</SelectItem>
                <SelectItem value="REFUND">Возврат</SelectItem>
                <SelectItem value="VOID">Аннуляция</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterFormat}
              onValueChange={(v) => setFilterFormat(v as 'ALL' | RFormat)}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Формат" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Любой формат</SelectItem>
                <SelectItem value="80mm">80mm</SelectItem>
                <SelectItem value="58mm">58mm</SelectItem>
                <SelectItem value="A4">A4</SelectItem>
                <SelectItem value="EMAIL">EMAIL</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Список чеков ({visible.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="grid place-items-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : visible.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                Чеков не найдено по выбранным фильтрам.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">№ чека</th>
                      <th className="px-3 py-2 text-left">Заказ</th>
                      <th className="px-3 py-2 text-left">Клиент</th>
                      <th className="px-3 py-2 text-left">Тип</th>
                      <th className="px-3 py-2 text-left">Формат</th>
                      <th className="px-3 py-2 text-right">Сумма</th>
                      <th className="px-3 py-2 text-left">Статус</th>
                      <th className="px-3 py-2 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visible.map((r) => {
                      const t = TYPE_LABELS[r.type]
                      return (
                        <tr key={r.id} className="hover:bg-accent/30">
                          <td className="px-3 py-2 font-mono text-xs">
                            {r.receiptNumber}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            #{r.order?.orderNumber ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {r.order?.customer?.name ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {r.order?.customer?.phone && (
                              <div className="text-[10px] text-muted-foreground">
                                {r.order.customer.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="secondary"
                              className={cn('text-[10px]', t.tone)}
                            >
                              {t.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-xs">{r.format}</td>
                          <td className="px-3 py-2 text-right font-bold tabular-nums">
                            {r.order?.grandTotal != null
                              ? formatCurrency(r.order.grandTotal, 'UZS')
                              : '—'}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap items-center gap-1">
                              {r.printedAt && (
                                <Badge
                                  variant="secondary"
                                  className="bg-cyan-100 text-cyan-800 text-[10px]"
                                >
                                  <Printer className="mr-1 h-3 w-3" />
                                  печать
                                </Badge>
                              )}
                              {r.emailedTo && (
                                <Badge
                                  variant="secondary"
                                  className="bg-indigo-100 text-indigo-800 text-[10px]"
                                >
                                  <Mail className="mr-1 h-3 w-3" />
                                  email
                                </Badge>
                              )}
                              {r.smsTo && (
                                <Badge
                                  variant="secondary"
                                  className="bg-violet-100 text-violet-800 text-[10px]"
                                >
                                  <MessageSquare className="mr-1 h-3 w-3" />
                                  SMS
                                </Badge>
                              )}
                              {!r.printedAt && !r.emailedTo && !r.smsTo && (
                                <span className="text-[10px] text-muted-foreground">
                                  не отправлен
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => reprint(r)}
                              >
                                <Printer className="mr-1 h-3 w-3" />
                                Печать
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => openSend(r)}
                              >
                                <Send className="mr-1 h-3 w-3" />
                                Отправить
                              </Button>
                            </div>
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

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отправить чек клиенту</DialogTitle>
            <DialogDescription>
              {sendTarget && (
                <>
                  Чек {sendTarget.receiptNumber} · заказ #
                  {sendTarget.order?.orderNumber ?? '—'}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={sendForm.email}
                onChange={(e) =>
                  setSendForm((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="customer@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Телефон (для SMS)</Label>
              <Input
                value={sendForm.phone}
                onChange={(e) =>
                  setSendForm((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="+998..."
                className="mt-1"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Достаточно одного из полей. Можно отправить и по email, и по SMS
              одновременно.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submitSend} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1 h-4 w-4" />
              )}
              Отправить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
