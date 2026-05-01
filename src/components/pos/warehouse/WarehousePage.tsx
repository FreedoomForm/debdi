'use client'
/**
 * /pos/warehouse — modern warehouse / inventory dashboard built on top of
 * the legacy /api/admin/warehouse/* endpoints.
 *
 * The legacy /middle-admin?tab=warehouse view (src/components/admin/WarehouseTab.tsx)
 * is preserved and remains accessible; this is the *new UI* counterpart with
 * a focused KPI strip, sub-tabs (Inventory, Cooking plan, Sets, Dishes), search
 * and a quick "Buy ingredients" dialog that posts to /api/admin/finance/buy-ingredients.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Boxes,
  ChefHat,
  Layers,
  Utensils,
  Loader2,
  Filter,
  AlertTriangle,
  Plus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  PencilLine,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/pos'
import { cn } from '@/lib/utils'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { PosDateSelector } from '@/components/pos/shared/PosDateSelector'
import { FilterToolbar } from '@/components/admin/dashboard/shared/FilterToolbar'
import { Textarea } from '@/components/ui/textarea'
import type { DateRange } from 'react-day-picker'

type Ingredient = {
  id: string
  name: string
  unit: string
  amount: number
  minAmount?: number | null
  costPerUnit?: number | null
  pricePerUnit?: number | null
  priceUnit?: string | null
  kcalPerGram?: number | null
  updatedAt?: string
}

type Dish = {
  id: string
  name: string
  description?: string | null
  category?: string
  mealType?: string
  ingredients?: Array<{ name: string; amount: number; unit: string }>
  caloriesPerPortion?: number | null
}

type DishIngredient = { name: string; amount: string; unit: string }

const MEAL_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'BREAKFAST', label: 'Завтрак' },
  { value: 'SECOND_BREAKFAST', label: '2-й завтрак' },
  { value: 'LUNCH', label: 'Обед' },
  { value: 'SNACK', label: 'Перекус' },
  { value: 'DINNER', label: 'Ужин' },
  { value: 'SIXTH_MEAL', label: '6-й приём' },
]

const MEAL_TYPE_LABELS: Record<string, string> = MEAL_TYPE_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.label }),
  {} as Record<string, string>
)

type SetItem = {
  id: string
  name: string
  description?: string | null
  caloriesTarget?: number | null
  isActive?: boolean
  updatedAt?: string
  calorieGroups?: Record<string, unknown>
}

type CookingPlanItem = {
  date: string
  setId: string
  setName?: string
  portions: number
}

export default function WarehousePage() {
  // Sub-section is driven by the URL ?tab=... param so the left-rail nav
  // can deep-link directly to /pos/warehouse?tab=cooking etc. — no
  // duplicate horizontal TabsList inside the page.
  type ActiveTab = 'inventory' | 'cooking' | 'sets' | 'dishes'
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get('tab')
  const active: ActiveTab =
    tabParam === 'cooking' || tabParam === 'sets' || tabParam === 'dishes'
      ? tabParam
      : 'inventory'
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  // Cooking plan period selector
  const [cookingDateRange, setCookingDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return { from: today, to: today }
  })

  const [inventory, setInventory] = useState<Ingredient[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])
  const [sets, setSets] = useState<SetItem[]>([])
  const [plan, setPlan] = useState<CookingPlanItem[]>([])

  // Buy ingredients modal
  const [buyOpen, setBuyOpen] = useState(false)
  const [buyItems, setBuyItems] = useState<Array<{ name: string; amount: string; costPerUnit: string }>>(
    [{ name: '', amount: '', costPerUnit: '' }]
  )
  const [submitting, setSubmitting] = useState(false)

  // Sets management state (create / edit / activate / delete) — ported
  // from the legacy SetsTab so users no longer need to bounce back to
  // /middle-admin?tab=warehouse just to create a set.
  const [setEditorOpen, setSetEditorOpen] = useState(false)
  const [editingSet, setEditingSet] = useState<SetItem | null>(null)
  const [setForm, setSetForm] = useState({ name: '', description: '' })
  const [savingSet, setSavingSet] = useState(false)
  const [mutatingSetId, setMutatingSetId] = useState<string | null>(null)

  // Ingredient editor (create / edit) — ports legacy IngredientsManager flow
  // so users can add/edit raw ingredients without leaving the new UI.
  const [ingredientEditorOpen, setIngredientEditorOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    amount: '',
    unit: 'gr',
    pricePerUnit: '',
    priceUnit: 'kg',
    kcalPerGram: '',
  })
  const [savingIngredient, setSavingIngredient] = useState(false)
  const [mutatingIngredientId, setMutatingIngredientId] = useState<string | null>(null)

  // Dish editor (create / edit recipe with ingredients) — ports legacy
  // DishesManager flow into the new POS warehouse page.
  const [dishEditorOpen, setDishEditorOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<Dish | null>(null)
  const [dishForm, setDishForm] = useState<{
    name: string
    description: string
    mealType: string
    ingredients: DishIngredient[]
  }>({ name: '', description: '', mealType: 'LUNCH', ingredients: [] })
  const [savingDish, setSavingDish] = useState(false)
  const [mutatingDishId, setMutatingDishId] = useState<string | null>(null)

  const loadInventory = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/warehouse/ingredients', { cache: 'no-store', credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setInventory(Array.isArray(data) ? data : data?.ingredients ?? [])
    } catch {
      /* silent */
    }
  }, [])

  const loadDishes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/warehouse/dishes', { cache: 'no-store', credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setDishes(Array.isArray(data) ? data : data?.dishes ?? [])
    } catch {
      /* silent */
    }
  }, [])

  const loadSets = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sets', { cache: 'no-store', credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setSets(Array.isArray(data) ? data : data?.sets ?? [])
    } catch {
      /* silent */
    }
  }, [])

  const loadPlan = useCallback(async () => {
    try {
      const selectedDate = cookingDateRange?.from ?? new Date()
      const dateStr = selectedDate.toISOString().slice(0, 10)
      const res = await fetch(`/api/admin/warehouse/cooking-plan?date=${dateStr}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      setPlan(Array.isArray(data) ? data : data?.items ?? data?.plan ?? [])
    } catch {
      /* silent */
    }
  }, [cookingDateRange])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadInventory(), loadDishes(), loadSets(), loadPlan()])
    } finally {
      setRefreshing(false)
    }
  }, [loadInventory, loadDishes, loadSets, loadPlan])

  useEffect(() => {
    refresh()
  }, [refresh])

  const stats = useMemo(() => {
    const lowStock = inventory.filter((i) => i.minAmount != null && i.amount <= i.minAmount)
    const outOfStock = inventory.filter((i) => i.amount <= 0)
    const totalValue = inventory.reduce(
      (s, i) => s + (i.costPerUnit ? i.costPerUnit * i.amount : 0),
      0
    )
    return {
      total: inventory.length,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      totalValue,
    }
  }, [inventory])

  const filteredInventory = useMemo(() => {
    if (!search) return inventory
    const q = search.toLowerCase()
    return inventory.filter((i) => i.name.toLowerCase().includes(q))
  }, [inventory, search])

  const filteredDishes = useMemo(() => {
    if (!search) return dishes
    const q = search.toLowerCase()
    return dishes.filter(
      (d) => d.name.toLowerCase().includes(q) || (d.category ?? '').toLowerCase().includes(q)
    )
  }, [dishes, search])

  const openCreateIngredient = () => {
    setEditingIngredient(null)
    setIngredientForm({
      name: '',
      amount: '',
      unit: 'gr',
      pricePerUnit: '',
      priceUnit: 'kg',
      kcalPerGram: '',
    })
    setIngredientEditorOpen(true)
  }

  const openEditIngredient = (ing: Ingredient) => {
    setEditingIngredient(ing)
    setIngredientForm({
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
    })
    setIngredientEditorOpen(true)
  }

  const saveIngredient = async () => {
    const name = ingredientForm.name.trim()
    if (!name) {
      toast.error('Введите название ингредиента')
      return
    }
    const parseNumber = (v: string): number | null => {
      const n = Number(v)
      return Number.isFinite(n) && v !== '' ? n : null
    }
    const payload: Record<string, unknown> = {
      name,
      amount: parseNumber(ingredientForm.amount) ?? 0,
      unit: ingredientForm.unit || 'gr',
      pricePerUnit: parseNumber(ingredientForm.pricePerUnit),
      priceUnit: ingredientForm.priceUnit || 'kg',
      kcalPerGram: parseNumber(ingredientForm.kcalPerGram),
    }
    if (editingIngredient?.id) payload.id = editingIngredient.id

    setSavingIngredient(true)
    try {
      const res = await fetch('/api/admin/warehouse/ingredients', {
        method: editingIngredient ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Не удалось сохранить ингредиент')
      }
      toast.success(editingIngredient ? 'Ингредиент обновлён' : 'Ингредиент создан')
      setIngredientEditorOpen(false)
      setEditingIngredient(null)
      await loadInventory()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSavingIngredient(false)
    }
  }

  const deleteIngredient = async (ing: Ingredient) => {
    const ok =
      typeof window === 'undefined' ? true : window.confirm(`Удалить «${ing.name}»?`)
    if (!ok) return
    setMutatingIngredientId(ing.id)
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
      await loadInventory()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setMutatingIngredientId(null)
    }
  }

  const openCreateDish = () => {
    setEditingDish(null)
    setDishForm({
      name: '',
      description: '',
      mealType: 'LUNCH',
      ingredients: [{ name: '', amount: '', unit: 'gr' }],
    })
    setDishEditorOpen(true)
  }

  const openEditDish = (dish: Dish) => {
    setEditingDish(dish)
    setDishForm({
      name: dish.name,
      description: dish.description ?? '',
      mealType: dish.mealType ?? 'LUNCH',
      ingredients:
        Array.isArray(dish.ingredients) && dish.ingredients.length > 0
          ? dish.ingredients.map((ing) => ({
              name: ing.name,
              amount: String(ing.amount ?? ''),
              unit: ing.unit ?? 'gr',
            }))
          : [{ name: '', amount: '', unit: 'gr' }],
    })
    setDishEditorOpen(true)
  }

  const updateDishIngredient = (
    idx: number,
    field: keyof DishIngredient,
    value: string
  ) => {
    setDishForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === idx ? { ...ing, [field]: value } : ing
      ),
    }))
  }

  const addDishIngredientRow = () =>
    setDishForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: '', unit: 'gr' }],
    }))

  const removeDishIngredientRow = (idx: number) =>
    setDishForm((prev) => ({
      ...prev,
      ingredients:
        prev.ingredients.length > 1
          ? prev.ingredients.filter((_, i) => i !== idx)
          : prev.ingredients,
    }))

  const saveDish = async () => {
    const name = dishForm.name.trim()
    if (!name) {
      toast.error('Введите название блюда')
      return
    }
    if (!dishForm.mealType) {
      toast.error('Выберите тип приёма пищи')
      return
    }
    const cleanedIngredients = dishForm.ingredients
      .map((ing) => ({
        name: ing.name.trim(),
        amount: Number(ing.amount),
        unit: (ing.unit || 'gr').trim() || 'gr',
      }))
      .filter((ing) => ing.name && Number.isFinite(ing.amount) && ing.amount > 0)

    const payload: Record<string, unknown> = {
      name,
      description: dishForm.description.trim(),
      mealType: dishForm.mealType,
      ingredients: cleanedIngredients,
    }
    if (editingDish?.id) payload.id = editingDish.id

    setSavingDish(true)
    try {
      const res = await fetch('/api/admin/warehouse/dishes', {
        method: editingDish ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Не удалось сохранить блюдо')
      }
      toast.success(editingDish ? 'Блюдо обновлено' : 'Блюдо создано')
      setDishEditorOpen(false)
      setEditingDish(null)
      await loadDishes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSavingDish(false)
    }
  }

  const deleteDish = async (dish: Dish) => {
    const ok =
      typeof window === 'undefined' ? true : window.confirm(`Удалить блюдо «${dish.name}»?`)
    if (!ok) return
    setMutatingDishId(dish.id)
    try {
      const res = await fetch(
        `/api/admin/warehouse/dishes?id=${encodeURIComponent(dish.id)}`,
        { method: 'DELETE', credentials: 'include' }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Не удалось удалить блюдо')
      }
      toast.success('Блюдо удалено')
      await loadDishes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setMutatingDishId(null)
    }
  }

  const filteredSets = useMemo(() => {
    if (!search) return sets
    const q = search.toLowerCase()
    return sets.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q)
    )
  }, [sets, search])

  const openCreateSet = () => {
    setEditingSet(null)
    setSetForm({ name: '', description: '' })
    setSetEditorOpen(true)
  }

  const openEditSet = (set: SetItem) => {
    setEditingSet(set)
    setSetForm({ name: set.name, description: set.description ?? '' })
    setSetEditorOpen(true)
  }

  const saveSetMeta = async () => {
    const name = setForm.name.trim()
    if (!name) {
      toast.error('Введите название сета')
      return
    }
    setSavingSet(true)
    try {
      const res = await fetch(
        editingSet ? `/api/admin/sets/${editingSet.id}` : '/api/admin/sets',
        {
          method: editingSet ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name,
            description: setForm.description.trim(),
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Не удалось сохранить сет')
      }
      toast.success(editingSet ? 'Сет обновлён' : 'Сет создан')
      setSetEditorOpen(false)
      setEditingSet(null)
      setSetForm({ name: '', description: '' })
      await loadSets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSavingSet(false)
    }
  }

  const toggleSetActive = async (set: SetItem) => {
    setMutatingSetId(set.id)
    try {
      const res = await fetch(`/api/admin/sets/${set.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !set.isActive }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Не удалось изменить статус')
      }
      toast.success(!set.isActive ? 'Сет активирован' : 'Сет деактивирован')
      await loadSets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setMutatingSetId(null)
    }
  }

  const deleteSet = async (set: SetItem) => {
    const ok =
      typeof window === 'undefined' ? true : window.confirm(`Удалить сет «${set.name}»?`)
    if (!ok) return
    setMutatingSetId(set.id)
    try {
      const res = await fetch(`/api/admin/sets/${set.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Не удалось удалить сет')
      }
      toast.success('Сет удалён')
      await loadSets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setMutatingSetId(null)
    }
  }

  const getSetStats = (set: SetItem) => {
    const groups =
      set.calorieGroups && typeof set.calorieGroups === 'object'
        ? (set.calorieGroups as Record<string, unknown>)
        : {}
    const dayEntries = Object.entries(groups).filter(
      ([key, value]) => key !== '_meta' && Array.isArray(value)
    )
    const dayCount = dayEntries.length
    const groupCount = dayEntries.reduce(
      (sum, [, value]) => sum + (Array.isArray(value) ? value.length : 0),
      0
    )
    return { dayCount, groupCount }
  }

  // Buy ingredients
  const updateBuyItem = (idx: number, field: 'name' | 'amount' | 'costPerUnit', value: string) => {
    setBuyItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }
  const addBuyRow = () =>
    setBuyItems((prev) => [...prev, { name: '', amount: '', costPerUnit: '' }])
  const removeBuyRow = (idx: number) =>
    setBuyItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))

  const totalCost = useMemo(
    () =>
      buyItems.reduce((s, it) => {
        const a = Number(it.amount)
        const c = Number(it.costPerUnit)
        return Number.isFinite(a) && Number.isFinite(c) ? s + a * c : s
      }, 0),
    [buyItems]
  )

  const submitBuy = async () => {
    const cleaned = buyItems
      .map((it) => ({ name: it.name.trim(), amount: Number(it.amount), costPerUnit: Number(it.costPerUnit) }))
      .filter((it) => it.name && it.amount > 0 && it.costPerUnit > 0)
    if (cleaned.length === 0) {
      toast.error('Заполните хотя бы одну строку')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/finance/buy-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items: cleaned }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error ?? 'Не удалось сохранить закупку')
      }
      toast.success('Закупка проведена')
      setBuyOpen(false)
      setBuyItems([{ name: '', amount: '', costPerUnit: '' }])
      await loadInventory()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Склад"
        backHref="/pos/dashboard"
        icon={<Boxes className="h-4 w-4 text-emerald-600" />}
        actions={
          <>
            <RefreshButton onClick={refresh} loading={refreshing} />
            <Button size="sm" onClick={() => setBuyOpen(true)}>
              <ShoppingCart className="mr-1 h-4 w-4" />
              Закупка
            </Button>
          </>
        }
      />

      <main className="space-y-4 p-4 lg:p-6">

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Всего позиций"
          value={String(stats.total)}
          icon={<Boxes className="h-4 w-4" />}
          tone="neutral"
          hint="Уникальных SKU"
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
          icon={<Boxes className="h-4 w-4" />}
          tone="emerald"
          hint="По цене закупки"
        />
      </div>

      <Tabs value={active}>
        {/* Horizontal TabsList intentionally removed — sub-section is
            chosen from the unified left-rail (Каталог → Склад/План/Сеты/Блюда)
            via ?tab=… deep-links. This eliminates the duplicate header
            inside the page content area. */}

        <FilterToolbar
          searchValue={search}
          searchPlaceholder="Поиск по названию…"
          onSearchChange={setSearch}
        />

        <TabsContent value="inventory" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">Ингредиенты</h2>
              <p className="text-sm text-muted-foreground">
                Полный CRUD: добавление, редактирование, удаление сырья.
              </p>
            </div>
            <Button size="sm" onClick={openCreateIngredient}>
              <Plus className="mr-1 h-4 w-4" />
              Новый ингредиент
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ингредиент</TableHead>
                    <TableHead className="text-right">Остаток</TableHead>
                    <TableHead className="text-right">Мин.</TableHead>
                    <TableHead className="text-right">Цена/ед.</TableHead>
                    <TableHead className="text-right">Стоимость</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="w-24 text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        Нет позиций
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory
                      .sort((a, b) => a.amount - b.amount)
                      .map((i) => {
                        const isLow = i.minAmount != null && i.amount <= i.minAmount
                        const isOut = i.amount <= 0
                        const unitCost = i.costPerUnit ?? i.pricePerUnit ?? null
                        const busy = mutatingIngredientId === i.id
                        return (
                          <TableRow key={i.id}>
                            <TableCell className="font-medium">{i.name}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {i.amount.toLocaleString('ru-RU')} {i.unit}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                              {i.minAmount != null ? `${i.minAmount} ${i.unit}` : '—'}
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums">
                              {unitCost != null ? formatCurrency(unitCost, 'UZS') : '—'}
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums">
                              {unitCost != null ? formatCurrency(unitCost * i.amount, 'UZS') : '—'}
                            </TableCell>
                            <TableCell>
                              {isOut ? (
                                <Badge variant="secondary" className="bg-rose-100 text-rose-800">
                                  Нет в наличии
                                </Badge>
                              ) : isLow ? (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                  Мало
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                                  В норме
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => openEditIngredient(i)}
                                  disabled={busy}
                                  aria-label="Изменить"
                                >
                                  <PencilLine className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                  onClick={() => deleteIngredient(i)}
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
                            </TableCell>
                          </TableRow>
                        )
                      })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cooking" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">План готовки</h2>
              <p className="text-sm text-muted-foreground">
                Выберите дату для просмотра плана.
              </p>
            </div>
            <PosDateSelector
              value={cookingDateRange}
              onChange={setCookingDateRange}
              compact
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">План на выбранную дату</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сет</TableHead>
                    <TableHead className="text-right">Порций</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                        План пуст
                      </TableCell>
                    </TableRow>
                  ) : (
                    plan.map((p, idx) => (
                      <TableRow key={`${p.setId}-${idx}`}>
                        <TableCell className="font-medium">{p.setName ?? p.setId}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.portions}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.date}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sets" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">Меню-сеты</h2>
              <p className="text-sm text-muted-foreground">
                Создание, редактирование и активация сетов прямо в новом UI.
              </p>
            </div>
            <Button size="sm" onClick={openCreateSet}>
              <Plus className="mr-1 h-4 w-4" />
              Новый сет
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSets.length === 0 ? (
              <Card className="col-span-full border-dashed">
                <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <Layers className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Сеты не настроены</div>
                    <p className="text-sm text-muted-foreground">
                      Создайте первый сет, чтобы распределять блюда по дням и активировать рацион.
                    </p>
                  </div>
                  <Button size="sm" onClick={openCreateSet}>
                    <Plus className="mr-1 h-4 w-4" /> Создать сет
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredSets.map((s) => {
                const meta = getSetStats(s)
                const busy = mutatingSetId === s.id
                return (
                  <Card
                    key={s.id}
                    className={cn(s.isActive && 'border-emerald-300 bg-emerald-50/30')}
                  >
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold">{s.name}</h3>
                            {s.isActive && (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                Активный
                              </Badge>
                            )}
                          </div>
                          {s.description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {s.description}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-muted-foreground">Без описания</p>
                          )}
                        </div>
                        {s.caloriesTarget != null && (
                          <Badge variant="secondary" className="shrink-0">
                            {s.caloriesTarget} ккал
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                          <div className="text-muted-foreground">Дней</div>
                          <div className="mt-1 font-semibold tabular-nums">{meta.dayCount}</div>
                        </div>
                        <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                          <div className="text-muted-foreground">Групп</div>
                          <div className="mt-1 font-semibold tabular-nums">{meta.groupCount}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant={s.isActive ? 'secondary' : 'default'}
                          onClick={() => toggleSetActive(s)}
                          disabled={busy}
                        >
                          {busy ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                          )}
                          {s.isActive ? 'Деактивировать' : 'Сделать активным'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditSet(s)}
                          disabled={busy}
                        >
                          <PencilLine className="mr-1 h-4 w-4" />
                          Изменить
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSet(s)}
                          disabled={busy}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Удалить
                        </Button>
                      </div>

                      {s.updatedAt && (
                        <p className="text-[11px] text-muted-foreground">
                          Обновлено: {new Date(s.updatedAt).toLocaleString('ru-RU')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="dishes" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">Блюда</h2>
              <p className="text-sm text-muted-foreground">
                Полный CRUD: создание рецептов, редактирование, удаление.
              </p>
            </div>
            <Button size="sm" onClick={openCreateDish}>
              <Plus className="mr-1 h-4 w-4" />
              Новое блюдо
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Блюдо</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead className="text-right">Калории</TableHead>
                    <TableHead className="text-right">Ингредиентов</TableHead>
                    <TableHead className="w-24 text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDishes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        Нет блюд
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDishes.map((d) => {
                      const busy = mutatingDishId === d.id
                      const mealLabel = d.mealType
                        ? MEAL_TYPE_LABELS[d.mealType] ?? d.mealType
                        : d.category ?? '—'
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">
                            <div>{d.name}</div>
                            {d.description && (
                              <div className="line-clamp-1 text-[11px] text-muted-foreground">
                                {d.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {mealLabel}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {d.caloriesPerPortion ?? '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {d.ingredients?.length ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => openEditDish(d)}
                                disabled={busy}
                                aria-label="Изменить"
                              >
                                <PencilLine className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                onClick={() => deleteDish(d)}
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
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dishEditorOpen} onOpenChange={setDishEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingDish ? 'Редактировать блюдо' : 'Новое блюдо'}</DialogTitle>
            <DialogDescription>
              Настройте название, тип приёма пищи и состав ингредиентов.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs">Название</Label>
                <Input
                  value={dishForm.name}
                  onChange={(e) => setDishForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Например, Куриная грудка с овощами"
                />
              </div>
              <div>
                <Label className="text-xs">Тип приёма</Label>
                <select
                  value={dishForm.mealType}
                  onChange={(e) =>
                    setDishForm((p) => ({ ...p, mealType: e.target.value }))
                  }
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  {MEAL_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Описание</Label>
                <Input
                  value={dishForm.description}
                  onChange={(e) =>
                    setDishForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Краткое описание (необязательно)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Состав</Label>
                <Button variant="outline" size="sm" onClick={addDishIngredientRow}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Ингредиент
                </Button>
              </div>

              <div className="space-y-2">
                {dishForm.ingredients.map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-end gap-2">
                    <div className="col-span-6">
                      <Input
                        value={ing.name}
                        onChange={(e) => updateDishIngredient(idx, 'name', e.target.value)}
                        placeholder="Название"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={ing.amount}
                        onChange={(e) => updateDishIngredient(idx, 'amount', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={ing.unit}
                        onChange={(e) => updateDishIngredient(idx, 'unit', e.target.value)}
                        placeholder="gr"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeDishIngredientRow(idx)}
                        disabled={dishForm.ingredients.length <= 1}
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
            <Button variant="outline" onClick={() => setDishEditorOpen(false)}>
              Отмена
            </Button>
            <Button onClick={saveDish} disabled={savingDish}>
              {savingDish ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              {editingDish ? 'Сохранить' : 'Создать блюдо'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ingredientEditorOpen} onOpenChange={setIngredientEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIngredient ? 'Редактировать ингредиент' : 'Новый ингредиент'}
            </DialogTitle>
            <DialogDescription>
              Используется в рецептах блюд, плане готовки и закупках.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Название</Label>
              <Input
                value={ingredientForm.name}
                onChange={(e) =>
                  setIngredientForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Курица грудка"
              />
            </div>
            <div>
              <Label className="text-xs">Остаток</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={ingredientForm.amount}
                onChange={(e) =>
                  setIngredientForm((p) => ({ ...p, amount: e.target.value }))
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Единица</Label>
              <Input
                value={ingredientForm.unit}
                onChange={(e) =>
                  setIngredientForm((p) => ({ ...p, unit: e.target.value }))
                }
                placeholder="gr / kg / ml / l / pcs"
              />
            </div>
            <div>
              <Label className="text-xs">Цена / ед., UZS</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={ingredientForm.pricePerUnit}
                onChange={(e) =>
                  setIngredientForm((p) => ({ ...p, pricePerUnit: e.target.value }))
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Ед. цены</Label>
              <Input
                value={ingredientForm.priceUnit}
                onChange={(e) =>
                  setIngredientForm((p) => ({ ...p, priceUnit: e.target.value }))
                }
                placeholder="kg"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Калорийность, ккал/гр</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={ingredientForm.kcalPerGram}
                onChange={(e) =>
                  setIngredientForm((p) => ({ ...p, kcalPerGram: e.target.value }))
                }
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIngredientEditorOpen(false)}>
              Отмена
            </Button>
            <Button onClick={saveIngredient} disabled={savingIngredient}>
              {savingIngredient ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              {editingIngredient ? 'Сохранить' : 'Создать ингредиент'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={setEditorOpen} onOpenChange={setSetEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSet ? 'Редактировать сет' : 'Новый сет'}</DialogTitle>
            <DialogDescription>
              Используется в плане готовки, складе и клиентских меню.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Название</Label>
              <Input
                value={setForm.name}
                onChange={(e) =>
                  setSetForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Например, Balance 1600"
              />
            </div>
            <div>
              <Label className="text-xs">Описание</Label>
              <Textarea
                value={setForm.description}
                onChange={(e) =>
                  setSetForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Короткое описание рациона или назначения сета"
                className="min-h-[96px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetEditorOpen(false)}>
              Отмена
            </Button>
            <Button onClick={saveSetMeta} disabled={savingSet}>
              {savingSet ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              {editingSet ? 'Сохранить' : 'Создать сет'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Закупка ингредиентов</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {buyItems.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-5">
                  <Label className="text-xs">Название</Label>
                  <Input
                    value={it.name}
                    onChange={(e) => updateBuyItem(idx, 'name', e.target.value)}
                    placeholder="Курица грудка"
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Кол-во</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={it.amount}
                    onChange={(e) => updateBuyItem(idx, 'amount', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Цена / ед.</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={it.costPerUnit}
                    onChange={(e) => updateBuyItem(idx, 'costPerUnit', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBuyRow(idx)}
                    disabled={buyItems.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addBuyRow} className="mt-2">
              <Plus className="mr-1 h-4 w-4" /> Ещё строка
            </Button>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Итого к оплате</span>
              <span className="font-bold tabular-nums">{formatCurrency(totalCost, 'UZS')}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submitBuy} disabled={submitting || totalCost <= 0}>
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              <ShoppingCart className="mr-1 h-4 w-4" />
              Провести закупку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </main>
    </div>
  )
}

// KPI tile is now provided by @/components/pos/shared/KpiTile (used directly above).
