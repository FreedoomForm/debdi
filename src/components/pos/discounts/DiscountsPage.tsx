'use client'
/**
 * Discounts / promo codes manager.
 *
 * Lists all configured discounts with quick toggle for active state.
 * "Code" column is the optional promo code customers/cashiers enter at
 * checkout. Empty code = "manual" discount only the cashier can apply.
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Check,
  Loader2,
  Percent,
  Plus,
  Tag,
  X,
  Pencil,
  Power,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
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
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { formatCurrency, formatDateTime, type PosDiscount } from '@/lib/pos'

const TYPE_LABELS: Record<PosDiscount['type'], string> = {
  PERCENT: 'Процент',
  FIXED: 'Фикс. сумма',
  BOGO: 'BOGO (1+1)',
  BUNDLE: 'Бандл',
}

const EMPTY: Partial<PosDiscount> = {
  name: '',
  code: '',
  type: 'PERCENT',
  value: 10,
  isActive: true,
}

export function DiscountsPage() {
  const [items, setItems] = useState<PosDiscount[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<PosDiscount> | null>(null)
  const [busy, setBusy] = useState(false)
  const [rowBusyId, setRowBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/discounts', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: PosDiscount[] }
      setItems(data.items ?? [])
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

  const toggleActive = async (item: PosDiscount) => {
    setRowBusyId(item.id)
    try {
      const res = await fetch(`/api/pos/discounts/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success(item.isActive ? 'Скидка отключена' : 'Скидка активирована')
      await load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось обновить'
      )
    } finally {
      setRowBusyId(null)
    }
  }

  const deleteItem = async (item: PosDiscount) => {
    const ok =
      typeof window === 'undefined' ? true : window.confirm(`Удалить «${item.name}»?`)
    if (!ok) return
    setRowBusyId(item.id)
    try {
      const res = await fetch(`/api/pos/discounts/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Скидка удалена')
      await load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось удалить'
      )
    } finally {
      setRowBusyId(null)
    }
  }

  const save = async () => {
    if (!editing || !editing.name?.trim()) return
    setBusy(true)
    try {
      const isUpdate = Boolean(editing.id)
      const res = await fetch(
        isUpdate ? `/api/pos/discounts/${editing.id}` : '/api/pos/discounts',
        {
          method: isUpdate ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: editing.name,
            code: editing.code || null,
            type: editing.type ?? 'PERCENT',
            value: Number(editing.value) || 0,
            minSubtotal:
              editing.minSubtotal != null ? Number(editing.minSubtotal) : null,
            startsAt: editing.startsAt || null,
            endsAt: editing.endsAt || null,
            usageLimit: editing.usageLimit ?? null,
            isActive: editing.isActive ?? true,
          }),
        }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Сохранено')
      setEditing(null)
      load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось сохранить'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Скидки и промо"
        icon={<Percent className="h-4 w-4 text-amber-500" />}
        backHref="/pos/terminal"
        actions={
          <>
            <RefreshButton onClick={load} loading={loading} />
            <Button size="sm" onClick={() => setEditing({ ...EMPTY })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Скидка
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-5xl px-4 py-6">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Скидок пока нет</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Создайте первую скидку: процент на чек, фиксированную сумму или
                промо-код.
              </p>
              <Button
                className="mt-3"
                size="sm"
                onClick={() => setEditing({ ...EMPTY })}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Добавить скидку
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((d) => (
              <article
                key={d.id}
                className={cn(
                  'rounded-xl border bg-card p-4 shadow-sm transition',
                  d.isActive
                    ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-card'
                    : 'border-border'
                )}
              >
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">{d.name}</div>
                    {d.code && (
                      <Badge
                        variant="secondary"
                        className="mt-1 font-mono text-[11px]"
                      >
                        <Tag className="mr-1 h-3 w-3" />
                        {d.code}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant={d.isActive ? 'default' : 'secondary'}
                      className={
                        d.isActive
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          : ''
                      }
                    >
                      {d.isActive ? '● Вкл' : 'Выкл'}
                    </Badge>
                  </div>
                </header>

                <div className="mt-2 flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => setEditing({ ...d })}
                    disabled={rowBusyId === d.id}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Изменить
                  </Button>
                  <Button
                    size="sm"
                    variant={d.isActive ? 'secondary' : 'default'}
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleActive(d)}
                    disabled={rowBusyId === d.id}
                  >
                    {rowBusyId === d.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Power className="mr-1 h-3 w-3" />
                    )}
                    {d.isActive ? 'Откл.' : 'Вкл.'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50"
                    onClick={() => deleteItem(d)}
                    disabled={rowBusyId === d.id}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Удалить
                  </Button>
                </div>

                <div className="mt-3 text-3xl font-extrabold tracking-tight">
                  {d.type === 'PERCENT'
                    ? `-${d.value}%`
                    : d.type === 'FIXED'
                      ? `-${formatCurrency(d.value, 'UZS')}`
                      : TYPE_LABELS[d.type]}
                </div>

                <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <dt>Тип</dt>
                    <dd className="font-medium text-foreground">
                      {TYPE_LABELS[d.type]}
                    </dd>
                  </div>
                  {d.minSubtotal && (
                    <div className="flex items-center justify-between">
                      <dt>От суммы</dt>
                      <dd className="font-medium text-foreground tabular-nums">
                        {formatCurrency(d.minSubtotal, 'UZS')}
                      </dd>
                    </div>
                  )}
                  {d.usageLimit && (
                    <div className="flex items-center justify-between">
                      <dt>Лимит</dt>
                      <dd className="font-medium text-foreground tabular-nums">
                        {d.usageCount} / {d.usageLimit}
                      </dd>
                    </div>
                  )}
                  {d.endsAt && (
                    <div className="flex items-center justify-between">
                      <dt>До</dt>
                      <dd className="font-medium text-foreground">
                        {formatDateTime(d.endsAt)}
                      </dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Editor */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? 'Редактировать скидку' : 'Новая скидка'}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Название*
                </Label>
                <Input
                  value={editing.name ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  placeholder="напр. Счастливый час, Скидка студентам"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Тип
                </Label>
                <Select
                  value={editing.type ?? 'PERCENT'}
                  onValueChange={(v) =>
                    setEditing({ ...editing, type: v as PosDiscount['type'] })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as PosDiscount['type'][]).map(
                      (t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Значение*
                </Label>
                <Input
                  type="number"
                  value={editing.value ?? 0}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      value: Number(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {editing.type === 'PERCENT' ? '% от суммы' : 'UZS'}
                </p>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Промо-код
                </Label>
                <Input
                  value={editing.code ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="напр. SUMMER25"
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Минимум суммы
                </Label>
                <Input
                  type="number"
                  value={editing.minSubtotal ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      minSubtotal:
                        e.target.value === ''
                          ? null
                          : Number(e.target.value),
                    })
                  }
                  placeholder="без минимума"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Лимит использований
                </Label>
                <Input
                  type="number"
                  value={editing.usageLimit ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      usageLimit:
                        e.target.value === ''
                          ? null
                          : Number(e.target.value),
                    })
                  }
                  placeholder="без лимита"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Действует с
                </Label>
                <Input
                  type="datetime-local"
                  value={
                    editing.startsAt
                      ? new Date(editing.startsAt).toISOString().slice(0, 16)
                      : ''
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      startsAt: e.target.value || null,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  По
                </Label>
                <Input
                  type="datetime-local"
                  value={
                    editing.endsAt
                      ? new Date(editing.endsAt).toISOString().slice(0, 16)
                      : ''
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      endsAt: e.target.value || null,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2 sm:col-span-2">
                <span className="text-sm font-medium">Активна</span>
                <Switch
                  checked={editing.isActive ?? true}
                  onCheckedChange={(v) =>
                    setEditing({ ...editing, isActive: v })
                  }
                />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={busy}
            >
              <X className="mr-1.5 h-4 w-4" /> Отмена
            </Button>
            <Button onClick={save} disabled={busy || !editing?.name?.trim()}>
              {busy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
