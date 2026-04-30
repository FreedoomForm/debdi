'use client'
/**
 * /pos/delivery — modern delivery orders dashboard built on top of
 * /api/orders. The legacy /middle-admin?tab=orders view is preserved
 * untouched; this is the *new UI* counterpart with KPI strip, status
 * pipeline, search, and live polling.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Receipt,
  Search,
  Loader2,
  RefreshCw,
  Filter,
  Download,
  Phone,
  MapPin,
  Truck,
  Clock,
  Pause,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/pos'
import { usePolling } from '@/hooks/usePolling'
import { cn } from '@/lib/utils'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'

type OrderStatus =
  | 'NEW'
  | 'PENDING'
  | 'IN_PROCESS'
  | 'IN_DELIVERY'
  | 'PAUSED'
  | 'DELIVERED'
  | 'CANCELED'
  | 'FAILED'

type DeliveryOrder = {
  id: string
  orderNumber?: string | null
  orderStatus: OrderStatus
  paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL'
  paymentMethod?: string
  totalAmount?: number
  deliveryDate?: string
  deliveryAddress?: string
  customerName?: string
  customerPhone?: string
  courier?: { id: string; name: string } | null
  customer?: { id: string; name: string; phone?: string } | null
  createdAt?: string
  notes?: string
}

const STATUS_META: Record<
  OrderStatus,
  { label: string; tone: string; icon: React.ReactNode }
> = {
  NEW: { label: 'Новый', tone: 'bg-sky-100 text-sky-800', icon: <Receipt className="h-3 w-3" /> },
  PENDING: { label: 'Ожидает', tone: 'bg-slate-100 text-slate-700', icon: <Clock className="h-3 w-3" /> },
  IN_PROCESS: { label: 'Готовится', tone: 'bg-amber-100 text-amber-800', icon: <Loader2 className="h-3 w-3" /> },
  IN_DELIVERY: { label: 'В доставке', tone: 'bg-indigo-100 text-indigo-800', icon: <Truck className="h-3 w-3" /> },
  PAUSED: { label: 'Пауза', tone: 'bg-zinc-100 text-zinc-700', icon: <Pause className="h-3 w-3" /> },
  DELIVERED: { label: 'Доставлен', tone: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle2 className="h-3 w-3" /> },
  CANCELED: { label: 'Отменён', tone: 'bg-rose-100 text-rose-700', icon: <XCircle className="h-3 w-3" /> },
  FAILED: { label: 'Сбой', tone: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" /> },
}

export default function DeliveryOrdersPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')

  // Today's orders by default — uses /api/orders?date=...
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }, [])

  const { data, loading, refresh } = usePolling<{ orders?: DeliveryOrder[] } | DeliveryOrder[]>(
    `/api/orders?date=${encodeURIComponent(today)}`,
    20000
  )

  useEffect(() => {
    if (!data) return
    const list = Array.isArray(data) ? data : data.orders ?? []
    setOrders(list)
  }, [data])

  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    let revenue = 0
    let pendingPayments = 0
    for (const o of orders) {
      counts[o.orderStatus] = (counts[o.orderStatus] ?? 0) + 1
      if (o.orderStatus === 'DELIVERED') revenue += o.totalAmount ?? 0
      if (o.paymentStatus !== 'PAID') pendingPayments += o.totalAmount ?? 0
    }
    return {
      total: orders.length,
      inProgress:
        (counts.NEW ?? 0) +
        (counts.PENDING ?? 0) +
        (counts.IN_PROCESS ?? 0) +
        (counts.IN_DELIVERY ?? 0),
      delivered: counts.DELIVERED ?? 0,
      revenue,
      pendingPayments,
      counts,
    }
  }, [orders])

  const filtered = useMemo(() => {
    let list = orders
    if (statusFilter !== 'all') list = list.filter((o) => o.orderStatus === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((o) => {
        const hay = `${o.orderNumber ?? ''} ${o.customerName ?? o.customer?.name ?? ''} ${
          o.customerPhone ?? o.customer?.phone ?? ''
        } ${o.deliveryAddress ?? ''} ${o.courier?.name ?? ''}`.toLowerCase()
        return hay.includes(q)
      })
    }
    return list
  }, [orders, statusFilter, search])

  const updateStatus = async (orderId: string, next: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderStatus: next }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error ?? 'Не удалось обновить статус')
      }
      toast.success(`Статус: ${STATUS_META[next].label}`)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    }
  }

  const exportCsv = () => {
    const rows = [
      ['№', 'Статус', 'Оплата', 'Сумма', 'Клиент', 'Телефон', 'Адрес', 'Курьер', 'Создано'],
      ...filtered.map((o) => [
        o.orderNumber ?? o.id,
        STATUS_META[o.orderStatus]?.label ?? o.orderStatus,
        o.paymentStatus ?? '',
        String(o.totalAmount ?? 0),
        o.customerName ?? o.customer?.name ?? '',
        o.customerPhone ?? o.customer?.phone ?? '',
        (o.deliveryAddress ?? '').replace(/[\r\n]+/g, ' '),
        o.courier?.name ?? '',
        o.createdAt ? new Date(o.createdAt).toLocaleString('ru-RU') : '',
      ]),
    ]
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `delivery-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Доставка"
        backHref="/pos/dashboard"
        icon={<Truck className="h-4 w-4 text-indigo-600" />}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              Обновить
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-1 h-4 w-4" />
              CSV
            </Button>
            <Button size="sm" asChild variant="outline">
              <a href="/pos/delivery/map">
                <MapPin className="mr-1 h-4 w-4" />
                Лайв-карта
              </a>
            </Button>
          </>
        }
      />

      <main className="space-y-4 p-4 lg:p-6">

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Всего заказов"
          value={stats.total}
          tone="neutral"
          hint="за сегодня"
        />
        <KpiTile
          label="В работе"
          value={stats.inProgress}
          tone={stats.inProgress > 0 ? 'amber' : 'neutral'}
          hint="новые / готовка / доставка"
        />
        <KpiTile
          label="Доставлено"
          value={stats.delivered}
          tone="emerald"
          hint="успешно завершено"
        />
        <KpiTile
          label="К оплате"
          value={formatCurrency(stats.pendingPayments, 'UZS')}
          tone={stats.pendingPayments > 0 ? 'rose' : 'neutral'}
          hint="не оплачено клиентами"
        />
      </div>

      {/* Status pipeline */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {(Object.keys(STATUS_META) as OrderStatus[]).map((s) => {
          const meta = STATUS_META[s]
          const count = stats.counts[s] ?? 0
          const active = statusFilter === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(active ? 'all' : s)}
              className={cn(
                'flex flex-col items-start rounded-md border px-2.5 py-1.5 text-left transition',
                active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent'
              )}
            >
              <Badge variant="secondary" className={cn('mb-1 gap-1', meta.tone)}>
                {meta.icon}
                {meta.label}
              </Badge>
              <span className="text-lg font-bold tabular-nums">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по номеру, клиенту, адресу, курьеру…"
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-1 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {(Object.keys(STATUS_META) as OrderStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>№</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Адрес</TableHead>
                <TableHead>Курьер</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead>Оплата</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {loading ? 'Загрузка…' : 'Заказов не найдено'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => {
                  const meta = STATUS_META[o.orderStatus]
                  const phone = o.customerPhone ?? o.customer?.phone
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">
                        {o.orderNumber ?? o.id.slice(0, 6)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{o.customerName ?? o.customer?.name ?? '—'}</div>
                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            <Phone className="h-3 w-3" />
                            {phone}
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <div className="line-clamp-2 text-xs">{o.deliveryAddress ?? '—'}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {o.courier?.name ?? <span className="text-muted-foreground">не назначен</span>}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {formatCurrency(o.totalAmount ?? 0, 'UZS')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px]',
                            o.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-700'
                          )}
                        >
                          {o.paymentStatus ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('gap-1', meta.tone)}>
                          {meta.icon}
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={o.orderStatus}
                          onValueChange={(v) => updateStatus(o.id, v as OrderStatus)}
                        >
                          <SelectTrigger className="h-7 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(STATUS_META) as OrderStatus[]).map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                {STATUS_META[s].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </main>
    </div>
  )
}

// KPI tile is now provided by @/components/pos/shared/KpiTile
