'use client'
/**
 * /pos/ingredients — dedicated raw-ingredients catalog page.
 *
 * Surfaces /api/admin/warehouse/ingredients (GET/POST/PUT/DELETE) directly
 * so admins can manage warehouse ingredients without entering the warehouse
 * sub-tab. Includes KPI strip, search, filter by stock status, and a full
 * editor dialog (create / edit) with all numeric fields.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Boxes,
  Filter,
  Flame,
  Loader2,
  PencilLine,
  Plus,
  Search,
  Trash2,
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
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { formatCurrency } from '@/lib/pos'

type Ingredient = {
  id: string
  name: string
  unit: string
  amount: number
  minAmount?: number | null
  pricePerUnit?: number | null
  costPerUnit?: number | null
  priceUnit?: string | null
  kcalPerGram?: number | null
  updatedAt?: string
}

type Filter = 'all' | 'low' | 'out' | 'ok'

export default function IngredientsPage() {
  const [items, setItems] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Ingredient | null>(null)
  const [form, setForm] = useState({
    name: '',
    amount: '',
    unit: 'gr',
    pricePerUnit: '',
    priceUnit: 'kg',
    kcalPerGram: '',
    minAmount: '',
  })
  const [saving, setSaving] = useState(false)
  const [rowBusyId, setRowBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/warehouse/ingredients', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setItems(Array.isArray(data) ? data : data?.ingredients ?? [])
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
    let total = items.length
    let lowStock = 0
    let outOfStock = 0
    let totalValue = 0
    for (const i of items) {
      const unitCost = i.pricePerUnit ?? i.costPerUnit ?? null
      if (unitCost != null) totalValue += unitCost * i.amount
      if (i.amount <= 0) outOfStock += 1
      else if (i.minAmount != null && i.amount <= i.minAmount) lowStock += 1
    }
    return {
      total,
      lowStock,
      outOfStock,
      okStock: total - lowStock - outOfStock,
      totalValue,
    }
  }, [items])

  const visible = useMemo(() => {
    let list = items
    if (filter === 'out') list = list.filter((i) => i.amount <= 0)
    else if (filter === 'low')
      list = list.filter(
        (i) => i.amount > 0 && i.minAmount != null && i.amount <= i.minAmount
      )
    else if (filter === 'ok')
      list = list.filter(
        (i) => i.amount > 0 && (i.minAmount == null || i.amount > i.minAmount)
      )
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((i) => i.name.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [items, filter, query])

  const openCreate = () => {
    setEditing(null)
    setForm({
      name: '',
      amount: '',
      unit: 'gr',
      pricePerUnit: '',
      priceUnit: 'kg',
      kcalPerGram: '',
      minAmount: '',
    })
    setEditorOpen(true)
  }

  const openEdit = (ing: Ingredient) => {
    setEditing(ing)
    setForm({
      name: ing.name,
      amount: String(ing.amount ?? 0),
      unit: ing.unit ?? 'gr',
      pricePerUnit:
        ing.pricePerUnit != null
          ? String(ing.pricePerUnit)
          : ing.costPerUnit != null
            ? String(ing.costPerUnit)
            : '',
      priceUnit: ing.priceUnit ?? 'kg',
      kcalPerGram: ing.kcalPerGram != null ? String(ing.kcalPerGram) : '',
      minAmount: ing.minAmount != null ? String(ing.minAmount) : '',
    })
    setEditorOpen(true)
  }

  const save = async () => {
    const name = form.name.trim()
    if (!name) {
      toast.error('Введите название ингредиента')
      return
    }
    const num = (v: string): number | null => {
      const n = Number(v)
      return Number.isFinite(n) && v !== '' ? n : null
    }
    const payload: Record<string, unknown> = {
      name,
      amount: num(form.amount) ?? 0,
      unit: form.unit || 'gr',
      pricePerUnit: num(form.pricePerUnit),
      priceUnit: form.priceUnit || 'kg',
      kcalPerGram: num(form.kcalPerGram),
      minAmount: num(form.minAmount),
    }
    if (editing?.id) payload.id = editing.id

    setSaving(true)
    try {
      const res = await fetch('/api/admin/warehouse/ingredients', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Не удалось сохранить ингредиент')
      }
      toast.success(editing ? 'Ингредиент обновлён' : 'Ингредиент создан')
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (ing: Ingredient) => {
    const ok =
      typeof window === 'undefined'
        ? true
        : window.confirm(`Удалить «${ing.name}»?`)
    if (!ok) return
    setRowBusyId(ing.id)
    try {
      const res = await fetch(
        `/api/admin/warehouse/ingredients?id=${encodeURIComponent(ing.id)}`,
        { method: 'DELETE', credentials: 'include' }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Не удалось удалить')
      }
      toast.success('Ингредиент удалён')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setRowBusyId(null)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Ингредиенты"
        icon={<Boxes className="h-4 w-4 text-emerald-500" />}
        backHref="/pos/warehouse"
        badge={items.length}
        actions={
          <>
            <RefreshButton onClick={load} loading={loading} />
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Новый ингредиент
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            label="Всего"
            value={String(stats.total)}
            icon={<Boxes className="h-4 w-4" />}
            tone="neutral"
            hint="Уникальных позиций"
          />
          <KpiTile
            label="Мало"
            value={String(stats.lowStock)}
            icon={<AlertTriangle className="h-4 w-4" />}
            tone={stats.lowStock > 0 ? 'amber' : 'neutral'}
            hint="Ниже мин. остатка"
          />
          <KpiTile
            label="Закончилось"
            value={String(stats.outOfStock)}
            icon={<AlertTriangle className="h-4 w-4" />}
            tone={stats.outOfStock > 0 ? 'rose' : 'neutral'}
            hint="Нулевой остаток"
          />
          <KpiTile
            label="Стоимость склада"
            value={formatCurrency(stats.totalValue, 'UZS')}
            icon={<Wallet className="h-4 w-4" />}
            tone="emerald"
            hint="По цене закупки"
          />
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-end gap-2 p-3">
            <div className="relative w-full sm:w-[260px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Поиск по названию"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Фильтр" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все ({stats.total})</SelectItem>
                <SelectItem value="ok">В норме ({stats.okStock})</SelectItem>
                <SelectItem value="low">Мало ({stats.lowStock})</SelectItem>
                <SelectItem value="out">Закончилось ({stats.outOfStock})</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Список ингредиентов ({visible.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="grid place-items-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : visible.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                {items.length === 0
                  ? 'Ингредиентов пока нет.'
                  : 'Под выбранный фильтр ничего не найдено.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Название</th>
                      <th className="px-3 py-2 text-right">Остаток</th>
                      <th className="px-3 py-2 text-right">Мин.</th>
                      <th className="px-3 py-2 text-right">Цена/ед.</th>
                      <th className="px-3 py-2 text-right">Ккал/гр</th>
                      <th className="px-3 py-2 text-left">Статус</th>
                      <th className="px-3 py-2 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visible.map((i) => {
                      const isOut = i.amount <= 0
                      const isLow =
                        !isOut && i.minAmount != null && i.amount <= i.minAmount
                      const unitCost = i.pricePerUnit ?? i.costPerUnit ?? null
                      const busy = rowBusyId === i.id
                      return (
                        <tr key={i.id} className="hover:bg-accent/30">
                          <td className="px-3 py-2 font-medium">{i.name}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {i.amount.toLocaleString('ru-RU')} {i.unit}
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-muted-foreground tabular-nums">
                            {i.minAmount != null
                              ? `${i.minAmount} ${i.unit}`
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums">
                            {unitCost != null ? (
                              <>
                                {formatCurrency(unitCost, 'UZS')}
                                <div className="text-[10px] text-muted-foreground">
                                  / {i.priceUnit ?? 'kg'}
                                </div>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums">
                            {i.kcalPerGram != null ? (
                              <span className="inline-flex items-center gap-1">
                                <Flame className="h-3 w-3 text-amber-500" />
                                {i.kcalPerGram}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isOut ? (
                              <Badge
                                variant="secondary"
                                className="bg-rose-100 text-rose-800"
                              >
                                Нет в наличии
                              </Badge>
                            ) : isLow ? (
                              <Badge
                                variant="secondary"
                                className="bg-amber-100 text-amber-800"
                              >
                                Мало
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-emerald-100 text-emerald-800"
                              >
                                В норме
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => openEdit(i)}
                                disabled={busy}
                                aria-label="Изменить"
                              >
                                <PencilLine className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                onClick={() => remove(i)}
                                disabled={busy}
                                aria-label="Удалить"
                              >
                                {busy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
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

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Редактировать ингредиент' : 'Новый ингредиент'}
            </DialogTitle>
            <DialogDescription>
              Используется в рецептах блюд, плане готовки и закупках.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Название</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Курица грудка"
              />
            </div>
            <div>
              <Label className="text-xs">Остаток</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount: e.target.value }))
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Единица</Label>
              <Input
                value={form.unit}
                onChange={(e) =>
                  setForm((p) => ({ ...p, unit: e.target.value }))
                }
                placeholder="gr / kg / ml / l / pcs"
              />
            </div>
            <div>
              <Label className="text-xs">Цена / ед., UZS</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={form.pricePerUnit}
                onChange={(e) =>
                  setForm((p) => ({ ...p, pricePerUnit: e.target.value }))
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Ед. цены</Label>
              <Input
                value={form.priceUnit}
                onChange={(e) =>
                  setForm((p) => ({ ...p, priceUnit: e.target.value }))
                }
                placeholder="kg"
              />
            </div>
            <div>
              <Label className="text-xs">Калорийность, ккал/гр</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={form.kcalPerGram}
                onChange={(e) =>
                  setForm((p) => ({ ...p, kcalPerGram: e.target.value }))
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Мин. остаток</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={form.minAmount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, minAmount: e.target.value }))
                }
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Отмена
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              {editing ? 'Сохранить' : 'Создать ингредиент'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
