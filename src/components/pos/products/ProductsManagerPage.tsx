'use client'
/**
 * Products / catalog manager.
 *
 * Lets the operator see, create, edit, and toggle products. Inventory levels
 * are visible inline; bulk actions live in the toolbar.
 *
 * Visual language matches the rest of the admin shell:
 *   • amber primary CTAs
 *   • slate-tinted neutrals
 *   • flat 1px borders + soft shadows (no glassmorphism)
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Barcode,
  Check,
  Edit3,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { Field } from '@/components/pos/shared/FormPrimitives'
import { formatCurrency, type PosCategory, type PosProduct } from '@/lib/pos'

type EditableProduct = Partial<PosProduct> & { name: string; sellPrice: number }

const EMPTY_PRODUCT: EditableProduct = {
  name: '',
  sellPrice: 0,
  costPrice: 0,
  taxRate: 0,
  trackStock: true,
  stockOnHand: 0,
  unit: 'pcs',
  isActive: true,
  isFavorite: false,
}

export function ProductsManagerPage() {
  const [products, setProducts] = useState<PosProduct[]>([])
  const [categories, setCategories] = useState<PosCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all')
  const [editing, setEditing] = useState<EditableProduct | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/pos/products?active=0', { credentials: 'include' }),
        fetch('/api/pos/categories', { credentials: 'include' }),
      ])
      const pj = (await prodRes.json().catch(() => ({}))) as { items?: PosProduct[] }
      const cj = (await catRes.json().catch(() => ({}))) as { items?: PosCategory[] }
      setProducts(pj.items ?? [])
      setCategories(cj.items ?? [])
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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (activeCategory !== 'all' && p.categoryId !== activeCategory) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.barcode ?? '').toLowerCase().includes(q)
      )
    })
  }, [products, query, activeCategory])

  const lowStockCount = useMemo(
    () =>
      products.filter(
        (p) =>
          p.trackStock &&
          typeof p.reorderLevel === 'number' &&
          p.stockOnHand <= (p.reorderLevel || 0)
      ).length,
    [products]
  )

  const startCreate = () => {
    setEditing({ ...EMPTY_PRODUCT })
    setEditingId(null)
  }
  const startEdit = (p: PosProduct) => {
    setEditing({ ...p })
    setEditingId(p.id)
  }
  const cancel = () => {
    setEditing(null)
    setEditingId(null)
  }

  const save = async () => {
    if (!editing) return
    if (!editing.name.trim()) {
      toast.error('Введите название')
      return
    }
    setBusy(true)
    try {
      const url = editingId
        ? `/api/pos/products/${editingId}`
        : '/api/pos/products'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editing.name,
          sku: editing.sku || null,
          barcode: editing.barcode || null,
          description: editing.description || null,
          categoryId: editing.categoryId || null,
          imageUrl: editing.imageUrl || null,
          costPrice: Number(editing.costPrice ?? 0) || null,
          sellPrice: Number(editing.sellPrice ?? 0),
          taxRate: Number(editing.taxRate ?? 0) || 0,
          trackStock: !!editing.trackStock,
          stockOnHand: Number(editing.stockOnHand ?? 0) || 0,
          reorderLevel:
            editing.reorderLevel != null
              ? Number(editing.reorderLevel)
              : null,
          unit: editing.unit || 'pcs',
          isActive: editing.isActive ?? true,
          isFavorite: editing.isFavorite ?? false,
          color: editing.color || null,
        }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `HTTP ${res.status}`)
      }
      toast.success(editingId ? 'Сохранено' : 'Создано')
      cancel()
      load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось сохранить'
      )
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Скрыть товар? Историю продаж сохраним.')) return
    try {
      const res = await fetch(`/api/pos/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Скрыт')
      load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось'
      )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PosPageHeader
        title="Товары"
        icon={<Package className="h-4 w-4 text-amber-500" />}
        badge={
          lowStockCount > 0 ? (
            <Badge variant="destructive" className="text-[10px]">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Мало: {lowStockCount}
            </Badge>
          ) : undefined
        }
        actions={
          <>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
              Обновить
            </Button>
            <Button size="sm" onClick={startCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Новый товар
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex shrink-0 flex-wrap gap-2 border-b border-border bg-card px-3 py-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Поиск по названию, SKU, штрихкоду"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <Select
          value={activeCategory}
          onValueChange={(v) => setActiveCategory(v as any)}
        >
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="px-3 py-3">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2 text-left"></th>
                <th className="px-3 py-2 text-left">Название</th>
                <th className="px-3 py-2 text-left">Категория</th>
                <th className="px-3 py-2 text-left">SKU / Штрих-код</th>
                <th className="px-3 py-2 text-right">Цена</th>
                <th className="px-3 py-2 text-right">Остаток</th>
                <th className="px-3 py-2 text-right">Налог</th>
                <th className="px-3 py-2 text-center">Активен</th>
                <th className="w-[120px] px-3 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="px-3 py-3">
                      <div className="h-6 w-full animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    Нет товаров. Нажмите «Новый товар», чтобы добавить.
                  </td>
                </tr>
              ) : (
                visible.map((p) => {
                  const lowStock =
                    p.trackStock &&
                    typeof p.reorderLevel === 'number' &&
                    p.stockOnHand <= (p.reorderLevel || 0)
                  return (
                    <tr key={p.id} className="hover:bg-accent/30">
                      <td className="px-3 py-2">
                        <div
                          className="grid h-9 w-9 place-items-center rounded-md text-[10px] font-semibold uppercase"
                          style={
                            p.color
                              ? { backgroundColor: `${p.color}22`, color: p.color }
                              : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
                          }
                        >
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt="" className="h-full w-full rounded-md object-cover" />
                          ) : (
                            p.name
                              .split(' ')
                              .slice(0, 2)
                              .map((w) => w[0])
                              .join('')
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {p.isFavorite && (
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          )}
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {p.category?.name ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                        {p.sku && <div>{p.sku}</div>}
                        {p.barcode && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Barcode className="h-3 w-3" />
                            {p.barcode}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {formatCurrency(p.sellPrice, 'UZS')}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {p.trackStock ? (
                          <span className={cn(lowStock && 'font-semibold text-rose-600')}>
                            {p.stockOnHand} {p.unit}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">∞</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {p.taxRate > 0 ? `${(p.taxRate * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge
                          variant={p.isActive ? 'default' : 'secondary'}
                          className={cn(
                            'text-[10px]',
                            p.isActive
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                              : ''
                          )}
                        >
                          {p.isActive ? 'Да' : 'Нет'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(p)}
                          className="h-7 px-2"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(p.id)}
                          className="h-7 px-2 text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && cancel()}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Редактировать товар' : 'Новый товар'}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <ScrollArea className="max-h-[70vh] pr-1">
              <div className="grid gap-3 py-1 sm:grid-cols-2">
                <Field label="Название*" full>
                  <Input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Описание" full>
                  <Input
                    value={editing.description ?? ''}
                    onChange={(e) =>
                      setEditing({ ...editing, description: e.target.value })
                    }
                  />
                </Field>
                <Field label="Категория">
                  <Select
                    value={editing.categoryId ?? 'none'}
                    onValueChange={(v) =>
                      setEditing({ ...editing, categoryId: v === 'none' ? null : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Без категории" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без категории</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Единица">
                  <Select
                    value={editing.unit ?? 'pcs'}
                    onValueChange={(v) => setEditing({ ...editing, unit: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">шт.</SelectItem>
                      <SelectItem value="kg">кг</SelectItem>
                      <SelectItem value="g">г</SelectItem>
                      <SelectItem value="l">л</SelectItem>
                      <SelectItem value="ml">мл</SelectItem>
                      <SelectItem value="m">м</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="SKU">
                  <Input
                    value={editing.sku ?? ''}
                    onChange={(e) =>
                      setEditing({ ...editing, sku: e.target.value })
                    }
                  />
                </Field>
                <Field label="Штрих-код">
                  <div className="flex items-center gap-1">
                    <Input
                      value={editing.barcode ?? ''}
                      onChange={(e) =>
                        setEditing({ ...editing, barcode: e.target.value })
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        // Generate ad-hoc EAN-13 prefix from current time.
                        const ts = Date.now().toString().padStart(12, '0').slice(-12)
                        setEditing({ ...editing, barcode: ts })
                      }}
                      title="Сгенерировать"
                    >
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                </Field>
                <Field label="Цена продажи*">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={editing.sellPrice ?? 0}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        sellPrice: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
                <Field label="Себестоимость">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={editing.costPrice ?? 0}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        costPrice: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
                <Field label="Налог (%)">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={Math.round((editing.taxRate ?? 0) * 100)}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        taxRate: (Number(e.target.value) || 0) / 100,
                      })
                    }
                  />
                </Field>
                <Field label="Остаток">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={editing.stockOnHand ?? 0}
                    disabled={!editing.trackStock}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        stockOnHand: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
                <Field label="Минимум для заказа">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={editing.reorderLevel ?? ''}
                    placeholder="не задано"
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        reorderLevel: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="URL картинки" full>
                  <Input
                    value={editing.imageUrl ?? ''}
                    onChange={(e) =>
                      setEditing({ ...editing, imageUrl: e.target.value })
                    }
                  />
                </Field>
                <Field label="Цвет плитки">
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={editing.color ?? '#94a3b8'}
                      onChange={(e) =>
                        setEditing({ ...editing, color: e.target.value })
                      }
                      className="h-10 w-14 cursor-pointer p-1"
                    />
                    <Input
                      value={editing.color ?? ''}
                      onChange={(e) =>
                        setEditing({ ...editing, color: e.target.value })
                      }
                      placeholder="#94a3b8"
                    />
                  </div>
                </Field>
                <div className="space-y-2 sm:col-span-2">
                  <ToggleField
                    label="Учитывать остаток"
                    checked={!!editing.trackStock}
                    onChange={(v) => setEditing({ ...editing, trackStock: v })}
                  />
                  <ToggleField
                    label="Закрепить в избранном (быстрый доступ)"
                    checked={!!editing.isFavorite}
                    onChange={(v) => setEditing({ ...editing, isFavorite: v })}
                  />
                  <ToggleField
                    label="Активен"
                    checked={editing.isActive ?? true}
                    onChange={(v) => setEditing({ ...editing, isActive: v })}
                  />
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={cancel} disabled={busy}>
              <X className="mr-1.5 h-4 w-4" /> Отмена
            </Button>
            <Button onClick={save} disabled={busy}>
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

// Field / ToggleField now sourced from @/components/pos/shared/FormPrimitives.
// ToggleField is the same shape as Toggle without the optional 'hint' prop.
import { Toggle as ToggleField } from '@/components/pos/shared/FormPrimitives'
export { ToggleField }
