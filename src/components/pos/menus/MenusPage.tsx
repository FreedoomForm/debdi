'use client'
/**
 * /pos/menus — 21-day menu cycle manager.
 *
 * Surfaces /api/admin/menus (GET / PUT / DELETE) which had no UI in the
 * new POS shell. Lists every menu number in the 21-day cycle with the
 * count of attached dishes, and lets admins click through to edit dish
 * assignments per day. Supports adding and removing dishes.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CalendarDays,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  Search,
  Utensils,
  X,
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
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'

type MenuSummary = {
  id: string
  number: number
  _count: { dishes: number }
}

type Dish = {
  id: string
  name: string
  description?: string | null
  mealType: string
  ingredients?: unknown
  caloriesPerPortion?: number | null
}

type FullMenu = {
  id: string
  number: number
  dishes: Dish[]
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: 'Завтрак',
  SECOND_BREAKFAST: '2-й завтрак',
  LUNCH: 'Обед',
  SNACK: 'Перекус',
  DINNER: 'Ужин',
  SIXTH_MEAL: '6-й приём',
}

const MEAL_TYPE_TONES: Record<string, string> = {
  BREAKFAST: 'bg-amber-100 text-amber-800',
  SECOND_BREAKFAST: 'bg-orange-100 text-orange-800',
  LUNCH: 'bg-emerald-100 text-emerald-800',
  SNACK: 'bg-cyan-100 text-cyan-800',
  DINNER: 'bg-violet-100 text-violet-800',
  SIXTH_MEAL: 'bg-rose-100 text-rose-800',
}

export default function MenusPage() {
  const [menus, setMenus] = useState<MenuSummary[]>([])
  const [allDishes, setAllDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)

  const [activeMenu, setActiveMenu] = useState<FullMenu | null>(null)
  const [openMenuLoading, setOpenMenuLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dishFilter, setDishFilter] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [addQuery, setAddQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [menuRes, dishRes] = await Promise.all([
        fetch('/api/admin/menus', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/admin/warehouse/dishes', {
          credentials: 'include',
          cache: 'no-store',
        }),
      ])
      if (!menuRes.ok) throw new Error(`HTTP ${menuRes.status}`)
      const md = (await menuRes.json()) as MenuSummary[]
      setMenus(Array.isArray(md) ? md : [])
      if (dishRes.ok) {
        const dd = await dishRes.json()
        setAllDishes(Array.isArray(dd) ? dd : dd?.dishes ?? [])
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

  const openMenu = async (number: number) => {
    setOpenMenuLoading(true)
    try {
      const res = await fetch(`/api/admin/menus?number=${number}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!data) {
        toast.error(`Меню №${number} ещё не создано в БД`)
        return
      }
      setActiveMenu(data as FullMenu)
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось открыть меню'
      )
    } finally {
      setOpenMenuLoading(false)
    }
  }

  const detachDish = async (dishId: string) => {
    if (!activeMenu) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/menus', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ menuNumber: activeMenu.number, dishId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as FullMenu
      setActiveMenu(data)
      // Update summary count
      setMenus((prev) =>
        prev.map((m) =>
          m.number === activeMenu.number
            ? { ...m, _count: { dishes: data.dishes.length } }
            : m
        )
      )
      toast.success('Удалено из меню')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setBusy(false)
    }
  }

  const attachDish = async (dishId: string) => {
    if (!activeMenu) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/menus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ menuNumber: activeMenu.number, dishId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as FullMenu
      setActiveMenu(data)
      setMenus((prev) =>
        prev.map((m) =>
          m.number === activeMenu.number
            ? { ...m, _count: { dishes: data.dishes.length } }
            : m
        )
      )
      toast.success('Добавлено в меню')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setBusy(false)
    }
  }

  // Always show 21 days even if some menus aren't yet seeded.
  const allMenuNumbers = useMemo(() => {
    const arr: Array<{ number: number; count: number; exists: boolean }> = []
    const map = new Map<number, MenuSummary>()
    for (const m of menus) map.set(m.number, m)
    for (let i = 1; i <= 21; i++) {
      const m = map.get(i)
      arr.push({
        number: i,
        count: m?._count.dishes ?? 0,
        exists: !!m,
      })
    }
    return arr
  }, [menus])

  const stats = useMemo(() => {
    const filledDays = allMenuNumbers.filter((m) => m.count > 0).length
    const totalAssignments = menus.reduce((s, m) => s + m._count.dishes, 0)
    const avg =
      menus.length > 0 ? Math.round((totalAssignments / menus.length) * 10) / 10 : 0
    return {
      filledDays,
      emptyDays: 21 - filledDays,
      totalAssignments,
      avgPerDay: avg,
    }
  }, [allMenuNumbers, menus])

  const visibleAttachedDishes = useMemo(() => {
    if (!activeMenu) return []
    if (!dishFilter.trim()) return activeMenu.dishes
    const q = dishFilter.toLowerCase()
    return activeMenu.dishes.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (MEAL_TYPE_LABELS[d.mealType] ?? d.mealType).toLowerCase().includes(q)
    )
  }, [activeMenu, dishFilter])

  const availableToAdd = useMemo(() => {
    if (!activeMenu) return []
    const attachedIds = new Set(activeMenu.dishes.map((d) => d.id))
    const list = allDishes.filter((d) => !attachedIds.has(d.id))
    if (!addQuery.trim()) return list
    const q = addQuery.toLowerCase()
    return list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (MEAL_TYPE_LABELS[d.mealType] ?? d.mealType).toLowerCase().includes(q)
    )
  }, [activeMenu, allDishes, addQuery])

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Меню (21-дневный цикл)"
        icon={<CalendarDays className="h-4 w-4 text-amber-500" />}
        backHref="/pos/warehouse"
        badge={menus.length}
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            label="Заполнено дней"
            value={String(stats.filledDays)}
            icon={<CalendarDays className="h-4 w-4" />}
            tone={stats.filledDays === 21 ? 'emerald' : 'amber'}
            hint="Из 21 дня"
          />
          <KpiTile
            label="Пустых дней"
            value={String(stats.emptyDays)}
            icon={<X className="h-4 w-4" />}
            tone={stats.emptyDays > 0 ? 'rose' : 'emerald'}
            hint="Требуют наполнения"
          />
          <KpiTile
            label="Назначений"
            value={String(stats.totalAssignments)}
            icon={<Utensils className="h-4 w-4" />}
            tone="cyan"
            hint="Всего привязок блюд"
          />
          <KpiTile
            label="Среднее"
            value={String(stats.avgPerDay)}
            icon={<Plus className="h-4 w-4" />}
            tone="violet"
            hint="Блюд / день"
          />
        </div>

        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Дни меню (1–21)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
                {allMenuNumbers.map((m) => (
                  <button
                    key={m.number}
                    type="button"
                    onClick={() => openMenu(m.number)}
                    disabled={!m.exists || openMenuLoading}
                    className={cn(
                      'group flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition',
                      m.count > 0
                        ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                        : 'border-border bg-card hover:bg-accent',
                      !m.exists && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <div className="text-2xl font-bold tabular-nums">
                      {m.number}
                    </div>
                    <div
                      className={cn(
                        'text-[10px] font-medium uppercase tracking-wider',
                        m.count > 0
                          ? 'text-emerald-700'
                          : 'text-muted-foreground'
                      )}
                    >
                      {m.count} блюд
                    </div>
                    {m.exists && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Per-day editor */}
      <Dialog
        open={!!activeMenu}
        onOpenChange={(open) => {
          if (!open) {
            setActiveMenu(null)
            setDishFilter('')
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Меню день {activeMenu?.number ?? ''} · {activeMenu?.dishes.length ?? 0}{' '}
              блюд
            </DialogTitle>
            <DialogDescription>
              Прикрепляйте и удаляйте блюда, чтобы заполнить рацион этого дня
              цикла.
            </DialogDescription>
          </DialogHeader>

          {!activeMenu ? null : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Фильтр прикреплённых"
                    value={dishFilter}
                    onChange={(e) => setDishFilter(e.target.value)}
                    className="h-9 pl-8"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setAddOpen(true)
                    setAddQuery('')
                  }}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Добавить блюдо
                </Button>
              </div>

              {visibleAttachedDishes.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                  {activeMenu.dishes.length === 0
                    ? 'В этом дне пока нет блюд. Нажмите «Добавить блюдо».'
                    : 'Нет совпадений по фильтру.'}
                </div>
              ) : (
                <ul className="max-h-[420px] space-y-1 overflow-auto rounded-md border border-border bg-card p-2">
                  {visibleAttachedDishes.map((d) => {
                    const tone = MEAL_TYPE_TONES[d.mealType] ?? 'bg-slate-100 text-slate-800'
                    const label = MEAL_TYPE_LABELS[d.mealType] ?? d.mealType
                    return (
                      <li
                        key={d.id}
                        className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent/40"
                      >
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px]', tone)}
                        >
                          {label}
                        </Badge>
                        <div className="min-w-0 flex-1 truncate">{d.name}</div>
                        {d.caloriesPerPortion != null && (
                          <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                            {d.caloriesPerPortion} ккал
                          </span>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                          onClick={() => detachDish(d.id)}
                          disabled={busy}
                          aria-label="Открепить"
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Minus className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveMenu(null)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add dish dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить блюдо в день {activeMenu?.number}</DialogTitle>
            <DialogDescription>
              Выберите из каталога блюд (создаются в /pos/warehouse?tab=dishes).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Поиск по названию или типу"
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                className="h-9 pl-8"
              />
            </div>

            {availableToAdd.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                Нет доступных блюд для добавления.
              </div>
            ) : (
              <ul className="max-h-[420px] space-y-1 overflow-auto rounded-md border border-border bg-card p-2">
                {availableToAdd.map((d) => {
                  const tone = MEAL_TYPE_TONES[d.mealType] ?? 'bg-slate-100 text-slate-800'
                  const label = MEAL_TYPE_LABELS[d.mealType] ?? d.mealType
                  return (
                    <li
                      key={d.id}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent/40"
                    >
                      <Badge
                        variant="secondary"
                        className={cn('text-[10px]', tone)}
                      >
                        {label}
                      </Badge>
                      <div className="min-w-0 flex-1 truncate">{d.name}</div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => attachDish(d.id)}
                        disabled={busy}
                      >
                        {busy ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="mr-1 h-3 w-3" />
                        )}
                        Добавить
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Готово
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
