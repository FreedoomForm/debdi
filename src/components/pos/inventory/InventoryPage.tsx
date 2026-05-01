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
  Search,
  Package,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/pos'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { Label } from '@/components/ui/label'
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
import { KpiTile } from '@/components/pos/shared/KpiTile'

type Product = {
  id: string
  name: string
  sku?: string | null
  unit: string
  stockOnHand: number
  trackStock: boolean
}

type CreateType = 'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'WASTE' | 'TRANSFER'

const CREATE_TYPE_OPTIONS: Array<{
  value: CreateType
  label: string
  hint: string
  defaultSign: 'positive' | 'negative'
}> = [
  {
    value: 'PURCHASE',
    label: 'Закупка',
    hint: 'Поступление от поставщика',
    defaultSign: 'positive',
  },
  {
    value: 'RETURN',
    label: 'Возврат',
    hint: 'Возврат от клиента (плюс)',
    defaultSign: 'positive',
  },
  {
    value: 'ADJUSTMENT',
    label: 'Коррекция',
    hint: 'Ручная корректировка (±)',
    defaultSign: 'positive',
  },
  {
    value: 'WASTE',
    label: 'Списание',
    hint: 'Брак / порча (минус)',
    defaultSign: 'negative',
  },
  {
    value: 'TRANSFER',
    label: 'Перевод',
    hint: 'Между филиалами (±)',
    defaultSign: 'negative',
  },
]

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
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  // Create movement dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<{
    productId: string
    type: CreateType
    quantity: string
    sign: 'positive' | 'negative'
    reason: string
    reference: string
  }>({
    productId: '',
    type: 'PURCHASE',
    quantity: '',
    sign: 'positive',
    reason: '',
    reference: '',
  })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [movRes, prodRes] = await Promise.all([
        fetch('/api/pos/inventory/movements?limit=300', {
          credentials: 'include',
        }),
        fetch('/api/pos/products?active=0', { credentials: 'include' }),
      ])
      if (!movRes.ok) throw new Error(`HTTP ${movRes.status}`)
      const movData = (await movRes.json()) as { items?: Movement[] }
      setMovements(movData.items ?? [])
      if (prodRes.ok) {
        const prodData = (await prodRes.json()) as { items?: Product[] }
        setProducts(prodData.items ?? [])
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  const submit = async () => {
    if (!form.productId) {
      toast.error('Выберите товар')
      return
    }
    const qty = Number(form.quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Укажите количество > 0')
      return
    }
    const signed = form.sign === 'negative' ? -Math.abs(qty) : Math.abs(qty)
    setBusy(true)
    try {
      const res = await fetch('/api/pos/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId: form.productId,
          type: form.type,
          quantity: signed,
          reason: form.reason.trim() || undefined,
          reference: form.reference.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success('Движение зафиксировано')
      setCreateOpen(false)
      setForm({
        productId: '',
        type: 'PURCHASE',
        quantity: '',
        sign: 'positive',
        reason: '',
        reference: '',
      })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setBusy(false)
    }
  }

  // Stats: counts of in/out/waste over the loaded movements window.
  const stats = useMemo(() => {
    let incoming = 0
    let outgoing = 0
    let wasteCount = 0
    let adjCount = 0
    for (const m of movements) {
      if (m.quantity > 0) incoming += m.quantity
      else outgoing += Math.abs(m.quantity)
      if (m.type === 'WASTE') wasteCount += 1
      if (m.type === 'ADJUSTMENT') adjCount += 1
    }
    return { incoming, outgoing, wasteCount, adjCount }
  }, [movements])

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
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Движения склада"
        icon={<Boxes className="h-4 w-4 text-amber-500" />}
        backHref="/pos/terminal"
        actions={
          <>
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
            <RefreshButton onClick={load} loading={loading} />
            <Button size="sm" onClick={() => setCreateOpen(true)} disabled={products.length === 0}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Движение
            </Button>
          </>
        }
      />

      <main className="space-y-3 px-3 py-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            label="Приход"
            value={String(Math.round(stats.incoming))}
            icon={<ArrowUp className="h-4 w-4" />}
            tone="emerald"
            hint="Сумма + по всем движениям"
          />
          <KpiTile
            label="Расход"
            value={String(Math.round(stats.outgoing))}
            icon={<ArrowDown className="h-4 w-4" />}
            tone={stats.outgoing > 0 ? 'rose' : 'neutral'}
            hint="Сумма − по всем движениям"
          />
          <KpiTile
            label="Списания"
            value={String(stats.wasteCount)}
            icon={<Trash2 className="h-4 w-4" />}
            tone={stats.wasteCount > 0 ? 'amber' : 'neutral'}
            hint="Кол-во записей WASTE"
          />
          <KpiTile
            label="Коррекции"
            value={String(stats.adjCount)}
            icon={<Package className="h-4 w-4" />}
            tone="violet"
            hint="Кол-во записей ADJUSTMENT"
          />
        </div>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Новое движение склада</DialogTitle>
            <DialogDescription>
              Закупка / возврат / коррекция / списание / перевод. Авто-86 и
              авто-разблокировка товара выполняются на сервере.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Товар*</Label>
              <Select
                value={form.productId}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, productId: v }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Выберите товар" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.sku ? ` · ${p.sku}` : ''}
                      {' · '}
                      {p.stockOnHand} {p.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Тип</Label>
              <Select
                value={form.type}
                onValueChange={(v) => {
                  const opt = CREATE_TYPE_OPTIONS.find((o) => o.value === v) ?? null
                  setForm((p) => ({
                    ...p,
                    type: v as CreateType,
                    sign: opt?.defaultSign ?? p.sign,
                  }))
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CREATE_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label} — {o.hint}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Направление</Label>
              <Select
                value={form.sign}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, sign: v as 'positive' | 'negative' }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">+ Приход</SelectItem>
                  <SelectItem value="negative">− Расход</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Количество*</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={form.quantity}
                onChange={(e) =>
                  setForm((p) => ({ ...p, quantity: e.target.value }))
                }
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Причина</Label>
              <Textarea
                value={form.reason}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reason: e.target.value }))
                }
                placeholder="Например: ежедневная закупка, списание брака, коррекция инвентаризации"
                className="mt-1 min-h-[64px]"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Референс</Label>
              <Input
                value={form.reference}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reference: e.target.value }))
                }
                placeholder="№ накладной, ID перевода и т.п."
                className="mt-1"
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
                <Plus className="mr-1 h-4 w-4" />
              )}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
