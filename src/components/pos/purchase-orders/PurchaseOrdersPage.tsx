'use client'
/**
 * /pos/purchase-orders — modern purchase orders manager.
 *
 * Surfaces /api/pos/purchase-orders (GET + POST) which previously had no UI.
 * Lists every PO with supplier, status, total cost and item count, with a
 * full creation dialog (supplier picker + multi-line items) plus KPI strip.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Boxes,
  CheckCircle2,
  CircleDashed,
  Clock,
  CreditCard,
  Loader2,
  Package,
  PackageCheck,
  PackageOpen,
  Plus,
  Trash2,
  Truck,
  XCircle,
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

type Status =
  | 'DRAFT'
  | 'ORDERED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELED'

type POItem = {
  id: string
  name: string
  quantity: number
  unitCost: number
  total: number
}

type PurchaseOrder = {
  id: string
  reference?: string | null
  status: Status
  totalCost: number
  notes?: string | null
  receivedAt?: string | null
  createdAt: string
  supplier: { id: string; name: string }
  items: POItem[]
}

type Supplier = {
  id: string
  name: string
  isActive: boolean
}

type Product = {
  id: string
  name: string
  sku?: string | null
  unit: string
  costPrice?: number | null
}

const STATUS_META: Record<
  Status,
  { label: string; tone: string; icon: typeof CircleDashed }
> = {
  DRAFT: { label: 'Черновик', tone: 'bg-slate-100 text-slate-800', icon: CircleDashed },
  ORDERED: { label: 'Заказан', tone: 'bg-blue-100 text-blue-800', icon: Clock },
  PARTIALLY_RECEIVED: {
    label: 'Частично принят',
    tone: 'bg-amber-100 text-amber-800',
    icon: PackageOpen,
  },
  RECEIVED: { label: 'Принят', tone: 'bg-emerald-100 text-emerald-800', icon: PackageCheck },
  CANCELED: { label: 'Отменён', tone: 'bg-rose-100 text-rose-800', icon: XCircle },
}

type FormItem = {
  productId: string
  name: string
  quantity: string
  unitCost: string
}

const EMPTY_ITEM: FormItem = {
  productId: '',
  name: '',
  quantity: '1',
  unitCost: '0',
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<{
    supplierId: string
    reference: string
    notes: string
    items: FormItem[]
  }>({
    supplierId: '',
    reference: '',
    notes: '',
    items: [{ ...EMPTY_ITEM }],
  })
  const [busy, setBusy] = useState(false)
  const [rowBusyId, setRowBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [ordRes, supRes, prodRes] = await Promise.all([
        fetch('/api/pos/purchase-orders', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/pos/suppliers', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/pos/products?active=0', { credentials: 'include', cache: 'no-store' }),
      ])
      if (!ordRes.ok) throw new Error(`HTTP ${ordRes.status}`)
      const od = (await ordRes.json()) as { items?: PurchaseOrder[] }
      setOrders(od.items ?? [])
      if (supRes.ok) {
        const sd = (await supRes.json()) as { items?: Supplier[] }
        setSuppliers((sd.items ?? []).filter((s) => s.isActive !== false))
      }
      if (prodRes.ok) {
        const pd = (await prodRes.json()) as { items?: Product[] }
        setProducts(pd.items ?? [])
      }
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

  const stats = useMemo(() => {
    let total = 0
    let pending = 0
    let received = 0
    for (const o of orders) {
      if (o.status === 'CANCELED') continue
      total += o.totalCost ?? 0
      if (o.status === 'RECEIVED') received += o.totalCost ?? 0
      else if (o.status === 'ORDERED' || o.status === 'PARTIALLY_RECEIVED' || o.status === 'DRAFT') {
        pending += o.totalCost ?? 0
      }
    }
    return {
      count: orders.length,
      total,
      pending,
      received,
    }
  }, [orders])

  const updateItem = (
    idx: number,
    patch: Partial<FormItem>
  ) =>
    setForm((p) => ({
      ...p,
      items: p.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }))

  const onPickProduct = (idx: number, productId: string) => {
    if (productId === '__manual__') {
      updateItem(idx, { productId: '' })
      return
    }
    const product = products.find((p) => p.id === productId)
    if (!product) return
    updateItem(idx, {
      productId,
      name: product.name,
      unitCost: product.costPrice != null ? String(product.costPrice) : '0',
    })
  }

  const addItem = () =>
    setForm((p) => ({ ...p, items: [...p.items, { ...EMPTY_ITEM }] }))

  const removeItem = (idx: number) =>
    setForm((p) => ({
      ...p,
      items:
        p.items.length > 1 ? p.items.filter((_, i) => i !== idx) : p.items,
    }))

  const formTotal = useMemo(
    () =>
      form.items.reduce((s, it) => {
        const q = Number(it.quantity)
        const c = Number(it.unitCost)
        return Number.isFinite(q) && Number.isFinite(c) ? s + q * c : s
      }, 0),
    [form.items]
  )

  const submit = async () => {
    if (!form.supplierId) {
      toast.error('Выберите поставщика')
      return
    }
    const cleaned = form.items
      .map((it) => ({
        productId: it.productId || undefined,
        name: it.name.trim(),
        quantity: Number(it.quantity),
        unitCost: Number(it.unitCost),
      }))
      .filter(
        (it) =>
          it.name &&
          Number.isFinite(it.quantity) &&
          it.quantity > 0 &&
          Number.isFinite(it.unitCost) &&
          it.unitCost >= 0
      )
    if (cleaned.length === 0) {
      toast.error('Заполните хотя бы одну строку')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/pos/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          supplierId: form.supplierId,
          reference: form.reference.trim() || null,
          notes: form.notes.trim() || null,
          items: cleaned,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success('Заказ поставщику создан')
      setCreateOpen(false)
      setForm({
        supplierId: '',
        reference: '',
        notes: '',
        items: [{ ...EMPTY_ITEM }],
      })
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
        title="Заказы поставщикам"
        icon={<Truck className="h-4 w-4 text-amber-500" />}
        backHref="/pos/dashboard"
        badge={orders.length}
        actions={
          <>
            <RefreshButton onClick={load} loading={loading} />
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              disabled={suppliers.length === 0}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Новый PO
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            label="Всего PO"
            value={String(stats.count)}
            icon={<Package className="h-4 w-4" />}
            tone="neutral"
            hint="Последние 200 заказов"
          />
          <KpiTile
            label="Ожидает приёмки"
            value={formatCurrency(stats.pending, 'UZS')}
            icon={<Clock className="h-4 w-4" />}
            tone={stats.pending > 0 ? 'amber' : 'neutral'}
            hint="DRAFT / ORDERED / PARTIALLY"
          />
          <KpiTile
            label="Принято"
            value={formatCurrency(stats.received, 'UZS')}
            icon={<CheckCircle2 className="h-4 w-4" />}
            tone="emerald"
            hint="Сумма по RECEIVED"
          />
          <KpiTile
            label="Оборот"
            value={formatCurrency(stats.total, 'UZS')}
            icon={<CreditCard className="h-4 w-4" />}
            tone="cyan"
            hint="Без учёта CANCELED"
          />
        </div>

        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Заказов поставщикам пока нет.
              {suppliers.length === 0 && (
                <div className="mt-2 text-xs">
                  Сначала добавьте поставщика в /pos/suppliers.
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((o) => {
              const meta = STATUS_META[o.status]
              const Icon = meta.icon
              const busy = rowBusyId === o.id
              return (
                <Card key={o.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-sm">
                          {o.supplier.name}
                        </CardTitle>
                        {o.reference && (
                          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {o.reference}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn('text-[10px]', meta.tone)}
                      >
                        <Icon className="mr-1 h-3 w-3" />
                        {meta.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Сумма
                        </div>
                        <div className="text-xl font-bold tabular-nums">
                          {formatCurrency(o.totalCost ?? 0, 'UZS')}
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground">
                        <div>{o.items.length} позиций</div>
                        <div className="tabular-nums">
                          {new Date(o.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </div>

                    <ul className="space-y-1 text-xs">
                      {o.items.slice(0, 3).map((it) => (
                        <li
                          key={it.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{it.name}</span>
                          <span className="shrink-0 text-muted-foreground tabular-nums">
                            {it.quantity} ×{' '}
                            {formatCurrency(it.unitCost, 'UZS')}
                          </span>
                        </li>
                      ))}
                      {o.items.length > 3 && (
                        <li className="text-[10px] text-muted-foreground">
                          + ещё {o.items.length - 3}…
                        </li>
                      )}
                    </ul>

                    {o.notes && (
                      <p className="line-clamp-2 text-xs italic text-muted-foreground">
                        {o.notes}
                      </p>
                    )}

                    {busy && (
                      <div className="flex items-center justify-center py-1 text-xs text-muted-foreground">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Обновление…
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Новый заказ поставщику</DialogTitle>
            <DialogDescription>
              Создайте PO с одной или несколькими позициями. Можно выбрать товар
              из каталога (тогда цена закупки подтянется автоматически) или
              ввести произвольное название.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Поставщик*</Label>
                <Select
                  value={form.supplierId}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, supplierId: v }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Выберите поставщика" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">№ накладной / референс</Label>
                <Input
                  value={form.reference}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, reference: e.target.value }))
                  }
                  placeholder="напр. INV-2026-0042"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between pb-1">
                <Label className="text-xs">Позиции</Label>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Строка
                </Button>
              </div>
              <div className="space-y-2">
                {form.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 items-end gap-2 rounded-md border border-border p-2"
                  >
                    <div className="col-span-12 sm:col-span-4">
                      <Label className="text-[11px]">Товар</Label>
                      <Select
                        value={it.productId || '__manual__'}
                        onValueChange={(v) => onPickProduct(idx, v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Выберите товар" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__manual__">
                            (вручную ввести название)
                          </SelectItem>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                              {p.sku ? ` · ${p.sku}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-12 sm:col-span-3">
                      <Label className="text-[11px]">Название*</Label>
                      <Input
                        value={it.name}
                        onChange={(e) =>
                          updateItem(idx, { name: e.target.value })
                        }
                        placeholder="напр. Курица грудка"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-[11px]">Кол-во</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(idx, { quantity: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <Label className="text-[11px]">Цена / ед.</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={it.unitCost}
                        onChange={(e) =>
                          updateItem(idx, { unitCost: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(idx)}
                        disabled={form.items.length <= 1}
                        aria-label="Удалить строку"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Итого</span>
                <span className="font-bold tabular-nums">
                  {formatCurrency(formTotal, 'UZS')}
                </span>
              </div>
            </div>

            <div>
              <Label className="text-xs">Комментарий</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Дополнительные условия, контакт, дата ожидаемой поставки и т.п."
                className="mt-1 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Boxes className="mr-1 h-4 w-4" />
              )}
              Создать заказ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
