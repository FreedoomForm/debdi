'use client'
/**
 * /pos/dishes — dishes catalog with full CRUD.
 *
 * Surfaces /api/admin/warehouse/dishes (GET/POST/PUT/DELETE) directly so
 * users can manage dishes from a dedicated page, not just inside the
 * Warehouse tab. Includes meal-type filter, search, KPI strip and a
 * full recipe editor (ingredients with name + amount + unit).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ChefHat,
  Filter,
  Flame,
  Loader2,
  PencilLine,
  Plus,
  Search,
  Trash2,
  Utensils,
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

type Dish = {
  id: string
  name: string
  description?: string | null
  mealType?: string
  caloriesPerPortion?: number | null
  ingredients?: Array<{ name: string; amount: number; unit: string }>
  menuNumbers?: number[]
}

type DishIngredient = { name: string; amount: string; unit: string }

const MEAL_TYPE_OPTIONS: Array<{ value: string; label: string; tone: string }> = [
  { value: 'BREAKFAST', label: 'Завтрак', tone: 'bg-amber-100 text-amber-800' },
  {
    value: 'SECOND_BREAKFAST',
    label: '2-й завтрак',
    tone: 'bg-orange-100 text-orange-800',
  },
  { value: 'LUNCH', label: 'Обед', tone: 'bg-emerald-100 text-emerald-800' },
  { value: 'SNACK', label: 'Перекус', tone: 'bg-cyan-100 text-cyan-800' },
  { value: 'DINNER', label: 'Ужин', tone: 'bg-violet-100 text-violet-800' },
  { value: 'SIXTH_MEAL', label: '6-й приём', tone: 'bg-slate-100 text-slate-800' },
]

const MEAL_TYPE_LABELS: Record<string, string> = MEAL_TYPE_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.label }),
  {} as Record<string, string>
)

const MEAL_TYPE_TONES: Record<string, string> = MEAL_TYPE_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.tone }),
  {} as Record<string, string>
)

export default function DishesPage() {
  const [items, setItems] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filterMeal, setFilterMeal] = useState<'ALL' | string>('ALL')

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Dish | null>(null)
  const [form, setForm] = useState<{
    name: string
    description: string
    mealType: string
    ingredients: DishIngredient[]
  }>({
    name: '',
    description: '',
    mealType: 'LUNCH',
    ingredients: [{ name: '', amount: '', unit: 'gr' }],
  })
  const [saving, setSaving] = useState(false)
  const [rowBusyId, setRowBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/warehouse/dishes', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setItems(Array.isArray(data) ? data : data?.dishes ?? [])
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

  const filtered = useMemo(() => {
    let list = items
    if (filterMeal !== 'ALL') {
      list = list.filter((d) => d.mealType === filterMeal)
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.description ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [items, filterMeal, query])

  const stats = useMemo(() => {
    const byType = items.reduce<Record<string, number>>((acc, d) => {
      const k = d.mealType ?? 'OTHER'
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})
    let withRecipe = 0
    let totalIngredients = 0
    for (const d of items) {
      if ((d.ingredients?.length ?? 0) > 0) withRecipe += 1
      totalIngredients += d.ingredients?.length ?? 0
    }
    return {
      total: items.length,
      withRecipe,
      avgIngredients:
        items.length > 0 ? Math.round((totalIngredients / items.length) * 10) / 10 : 0,
      uniqueMealTypes: Object.keys(byType).length,
    }
  }, [items])

  const openCreate = () => {
    setEditing(null)
    setForm({
      name: '',
      description: '',
      mealType: 'LUNCH',
      ingredients: [{ name: '', amount: '', unit: 'gr' }],
    })
    setEditorOpen(true)
  }

  const openEdit = (d: Dish) => {
    setEditing(d)
    setForm({
      name: d.name,
      description: d.description ?? '',
      mealType: d.mealType ?? 'LUNCH',
      ingredients:
        Array.isArray(d.ingredients) && d.ingredients.length > 0
          ? d.ingredients.map((ing) => ({
              name: ing.name,
              amount: String(ing.amount ?? ''),
              unit: ing.unit ?? 'gr',
            }))
          : [{ name: '', amount: '', unit: 'gr' }],
    })
    setEditorOpen(true)
  }

  const updateIng = (idx: number, field: keyof DishIngredient, value: string) =>
    setForm((p) => ({
      ...p,
      ingredients: p.ingredients.map((it, i) =>
        i === idx ? { ...it, [field]: value } : it
      ),
    }))

  const addIngRow = () =>
    setForm((p) => ({
      ...p,
      ingredients: [...p.ingredients, { name: '', amount: '', unit: 'gr' }],
    }))

  const removeIngRow = (idx: number) =>
    setForm((p) => ({
      ...p,
      ingredients:
        p.ingredients.length > 1
          ? p.ingredients.filter((_, i) => i !== idx)
          : p.ingredients,
    }))

  const save = async () => {
    const name = form.name.trim()
    if (!name) {
      toast.error('Введите название блюда')
      return
    }
    if (!form.mealType) {
      toast.error('Выберите тип приёма пищи')
      return
    }
    const cleaned = form.ingredients
      .map((ing) => ({
        name: ing.name.trim(),
        amount: Number(ing.amount),
        unit: (ing.unit || 'gr').trim() || 'gr',
      }))
      .filter((ing) => ing.name && Number.isFinite(ing.amount) && ing.amount > 0)

    const payload: Record<string, unknown> = {
      name,
      description: form.description.trim(),
      mealType: form.mealType,
      ingredients: cleaned,
    }
    if (editing?.id) payload.id = editing.id

    setSaving(true)
    try {
      const res = await fetch('/api/admin/warehouse/dishes', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Не удалось сохранить блюдо')
      }
      toast.success(editing ? 'Блюдо обновлено' : 'Блюдо создано')
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (d: Dish) => {
    const ok =
      typeof window === 'undefined'
        ? true
        : window.confirm(`Удалить блюдо «${d.name}»?`)
    if (!ok) return
    setRowBusyId(d.id)
    try {
      const res = await fetch(
        `/api/admin/warehouse/dishes?id=${encodeURIComponent(d.id)}`,
        { method: 'DELETE', credentials: 'include' }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Не удалось удалить')
      }
      toast.success('Блюдо удалено')
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
        title="Блюда"
        icon={<ChefHat className="h-4 w-4 text-rose-500" />}
        backHref="/pos/warehouse"
        badge={items.length}
        actions={
          <>
            <RefreshButton onClick={load} loading={loading} />
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Новое блюдо
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            label="Всего"
            value={String(stats.total)}
            icon={<Utensils className="h-4 w-4" />}
            tone="neutral"
          />
          <KpiTile
            label="С рецептом"
            value={String(stats.withRecipe)}
            icon={<ChefHat className="h-4 w-4" />}
            tone="emerald"
            hint={`${stats.total > 0 ? Math.round((stats.withRecipe / stats.total) * 100) : 0}%`}
          />
          <KpiTile
            label="Среднее ингр."
            value={String(stats.avgIngredients)}
            icon={<Flame className="h-4 w-4" />}
            tone="amber"
            hint="на блюдо"
          />
          <KpiTile
            label="Типов приёмов"
            value={String(stats.uniqueMealTypes)}
            icon={<Filter className="h-4 w-4" />}
            tone="violet"
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
            <Select
              value={filterMeal}
              onValueChange={(v) => setFilterMeal(v)}
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Тип приёма" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Любой тип</SelectItem>
                {MEAL_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {items.length === 0
                ? 'Блюд пока нет.'
                : 'Под выбранные фильтры блюд нет.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((d) => {
              const tone =
                MEAL_TYPE_TONES[d.mealType ?? ''] ?? 'bg-slate-100 text-slate-800'
              const label = d.mealType
                ? MEAL_TYPE_LABELS[d.mealType] ?? d.mealType
                : '—'
              const busy = rowBusyId === d.id
              return (
                <Card key={d.id} className="hover:shadow-md transition">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm">{d.name}</CardTitle>
                      <Badge
                        variant="secondary"
                        className={cn('text-[10px]', tone)}
                      >
                        {label}
                      </Badge>
                    </div>
                    {d.description && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {d.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Array.isArray(d.ingredients) && d.ingredients.length > 0 ? (
                      <ul className="space-y-1 text-xs">
                        {d.ingredients.slice(0, 4).map((ing, i) => (
                          <li
                            key={`${d.id}-${i}`}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{ing.name}</span>
                            <span className="shrink-0 text-muted-foreground tabular-nums">
                              {ing.amount} {ing.unit}
                            </span>
                          </li>
                        ))}
                        {d.ingredients.length > 4 && (
                          <li className="text-[10px] text-muted-foreground">
                            + ещё {d.ingredients.length - 4}…
                          </li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">
                        Без рецепта
                      </p>
                    )}

                    {d.caloriesPerPortion != null && (
                      <Badge variant="secondary" className="bg-amber-50 text-amber-800">
                        <Flame className="mr-1 h-3 w-3" />
                        {d.caloriesPerPortion} ккал
                      </Badge>
                    )}

                    <div className="flex flex-wrap items-center gap-1 border-t border-border pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => openEdit(d)}
                        disabled={busy}
                      >
                        <PencilLine className="mr-1 h-3 w-3" />
                        Изменить
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50"
                        onClick={() => remove(d)}
                        disabled={busy}
                      >
                        {busy ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="mr-1 h-3 w-3" />
                        )}
                        Удалить
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Редактировать блюдо' : 'Новое блюдо'}</DialogTitle>
            <DialogDescription>
              Настройте название, тип приёма пищи и состав ингредиентов.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs">Название</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Например, Куриная грудка с овощами"
                />
              </div>
              <div>
                <Label className="text-xs">Тип приёма</Label>
                <Select
                  value={form.mealType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, mealType: v }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Описание</Label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Краткое описание (необязательно)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Состав</Label>
                <Button variant="outline" size="sm" onClick={addIngRow}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Ингредиент
                </Button>
              </div>

              <div className="space-y-2">
                {form.ingredients.map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-end gap-2">
                    <div className="col-span-6">
                      <Input
                        value={ing.name}
                        onChange={(e) => updateIng(idx, 'name', e.target.value)}
                        placeholder="Название"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={ing.amount}
                        onChange={(e) => updateIng(idx, 'amount', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={ing.unit}
                        onChange={(e) => updateIng(idx, 'unit', e.target.value)}
                        placeholder="gr"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeIngRow(idx)}
                        disabled={form.ingredients.length <= 1}
                        aria-label="Удалить строку"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
              {editing ? 'Сохранить' : 'Создать блюдо'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
