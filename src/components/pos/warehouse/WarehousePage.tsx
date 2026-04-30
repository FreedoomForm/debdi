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
import {
  Boxes,
  ChefHat,
  Layers,
  Utensils,
  RefreshCw,
  Loader2,
  Filter,
  AlertTriangle,
  Plus,
  Trash2,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/pos'
import { cn } from '@/lib/utils'
import { KpiTile } from '@/components/pos/shared/KpiTile'

type Ingredient = {
  id: string
  name: string
  unit: string
  amount: number
  minAmount?: number | null
  costPerUnit?: number | null
  updatedAt?: string
}

type Dish = {
  id: string
  name: string
  category?: string
  ingredients?: Array<{ name: string; amount: number; unit: string }>
  caloriesPerPortion?: number | null
}

type SetItem = {
  id: string
  name: string
  description?: string
  caloriesTarget?: number | null
}

type CookingPlanItem = {
  date: string
  setId: string
  setName?: string
  portions: number
}

export default function WarehousePage() {
  const [active, setActive] = useState<'inventory' | 'cooking' | 'sets' | 'dishes'>('inventory')
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

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
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10)
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
  }, [])

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
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Boxes className="h-6 w-6 text-emerald-600" />
            Склад
          </h1>
          <p className="text-sm text-muted-foreground">
            Ингредиенты, блюда, меню-сеты и план готовки
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-4 w-4" />
            )}
            Обновить
          </Button>
          <Button size="sm" onClick={() => setBuyOpen(true)}>
            <ShoppingCart className="mr-1 h-4 w-4" />
            Закупка
          </Button>
        </div>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI
          label="Всего позиций"
          value={String(stats.total)}
          icon={<Boxes className="h-4 w-4" />}
          tone="neutral"
          hint="Уникальных SKU"
        />
        <KPI
          label="Мало"
          value={String(stats.lowStock)}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={stats.lowStock > 0 ? 'amber' : 'neutral'}
          hint="Ниже мин. остатка"
        />
        <KPI
          label="Закончилось"
          value={String(stats.outOfStock)}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={stats.outOfStock > 0 ? 'rose' : 'neutral'}
          hint="Нулевой остаток"
        />
        <KPI
          label="Стоимость склада"
          value={formatCurrency(stats.totalValue, 'UZS')}
          icon={<Boxes className="h-4 w-4" />}
          tone="emerald"
          hint="По цене закупки"
        />
      </div>

      <Tabs value={active} onValueChange={(v) => setActive(v as typeof active)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="inventory">
            <Boxes className="mr-1 h-3.5 w-3.5" /> Склад
          </TabsTrigger>
          <TabsTrigger value="cooking">
            <ChefHat className="mr-1 h-3.5 w-3.5" /> План готовки
          </TabsTrigger>
          <TabsTrigger value="sets">
            <Layers className="mr-1 h-3.5 w-3.5" /> Сеты
          </TabsTrigger>
          <TabsTrigger value="dishes">
            <Utensils className="mr-1 h-3.5 w-3.5" /> Блюда
          </TabsTrigger>
        </TabsList>

        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию…"
              className="pl-8"
            />
          </div>
        </div>

        <TabsContent value="inventory">
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        Нет позиций
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory
                      .sort((a, b) => a.amount - b.amount)
                      .map((i) => {
                        const isLow = i.minAmount != null && i.amount <= i.minAmount
                        const isOut = i.amount <= 0
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
                              {i.costPerUnit != null ? formatCurrency(i.costPerUnit, 'UZS') : '—'}
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums">
                              {i.costPerUnit != null ? formatCurrency(i.costPerUnit * i.amount, 'UZS') : '—'}
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
                          </TableRow>
                        )
                      })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cooking">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">План готовки на сегодня</CardTitle>
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

        <TabsContent value="sets">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sets.length === 0 ? (
              <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                Сеты не настроены
              </p>
            ) : (
              sets.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{s.name}</h3>
                        {s.description && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                        )}
                      </div>
                      {s.caloriesTarget != null && (
                        <Badge variant="secondary" className="shrink-0">
                          {s.caloriesTarget} ккал
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="dishes">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Блюдо</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead className="text-right">Калории</TableHead>
                    <TableHead className="text-right">Ингредиентов</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDishes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                        Нет блюд
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDishes.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {d.category ?? '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {d.caloriesPerPortion ?? '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {d.ingredients?.length ?? 0}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <Layers className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Полный функционал старого склада сохранён без изменений и доступен по{' '}
            <a
              href="/middle-admin?tab=warehouse"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              /middle-admin?tab=warehouse
            </a>
            : редактирование рецептов, дозаказ блюд через форму «Готовка», impact-план,
            аудит готовки и т.д. Эта страница использует те же эндпоинты и расширяет их
            KPI-сводкой, поиском и быстрой закупкой ингредиентов.
          </div>
        </CardContent>
      </Card>

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
    </div>
  )
}

// Local KPI alias — single source of truth lives in @/components/pos/shared/KpiTile.
const KPI = KpiTile
