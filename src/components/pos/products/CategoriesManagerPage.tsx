'use client'
/**
 * Categories manager — drag-to-reorder list of product categories.
 *
 * Categories drive the chip filter in the POS terminal grid; this page lets
 * admins rename them, recolor them, drag them into the desired order, and
 * archive ones they don't use.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Check,
  Edit3,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import type { PosCategory } from '@/lib/pos'

const EMPTY: Partial<PosCategory> & { isActive?: boolean } = {
  name: '',
  color: '#94a3b8',
  isActive: true,
  sortOrder: 0,
}

export function CategoriesManagerPage() {
  const [items, setItems] = useState<PosCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<
    (Partial<PosCategory> & { id?: string; isActive?: boolean }) | null
  >(null)
  const [busy, setBusy] = useState(false)
  const dragId = useRef<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/categories', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: PosCategory[] }
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

  const save = async () => {
    if (!editing?.name?.trim()) return
    setBusy(true)
    try {
      const url = editing.id
        ? `/api/pos/categories/${editing.id}`
        : '/api/pos/categories'
      const method = editing.id ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editing.name,
          color: editing.color || null,
          icon: editing.icon || null,
          parentId: editing.parentId || null,
          isActive: editing.isActive ?? true,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Сохранено')
      setEditing(null)
      load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось'
      )
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Удалить категорию?')) return
    try {
      const res = await fetch(`/api/pos/categories/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        if (text.includes('category_in_use')) {
          toast.error(
            'В категории есть товары. Перенесите их в другую категорию сначала.'
          )
          return
        }
        throw new Error(text || `HTTP ${res.status}`)
      }
      toast.success('Удалена')
      load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось'
      )
    }
  }

  const persistOrder = async (newItems: PosCategory[]) => {
    try {
      await fetch('/api/pos/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: newItems.map((c) => c.id) }),
      })
    } catch {
      /* silent */
    }
  }

  const onDragStart = (e: React.DragEvent, id: string) => {
    dragId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault()
    if (!dragId.current || dragId.current === overId) return
    setItems((prev) => {
      const dragIdx = prev.findIndex((p) => p.id === dragId.current)
      const overIdx = prev.findIndex((p) => p.id === overId)
      if (dragIdx === -1 || overIdx === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(overIdx, 0, moved)
      return next
    })
  }
  const onDragEnd = () => {
    if (dragId.current) persistOrder(items)
    dragId.current = null
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Категории товаров"
        backHref="/pos/products"
        actions={
          <>
            <RefreshButton onClick={load} loading={loading} />
            <Button size="sm" onClick={() => setEditing({ ...EMPTY })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Категория
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-2xl px-4 py-6">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Категорий пока нет. Создайте первую, чтобы группировать товары.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {items.map((c) => (
              <li
                key={c.id}
                draggable
                onDragStart={(e) => onDragStart(e, c.id)}
                onDragOver={(e) => onDragOver(e, c.id)}
                onDragEnd={onDragEnd}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition hover:shadow-md"
              >
                <button
                  type="button"
                  className="cursor-grab text-muted-foreground hover:text-foreground"
                  aria-label="Перетащить"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-xs font-bold uppercase"
                  style={{
                    backgroundColor: `${c.color ?? '#94a3b8'}22`,
                    color: c.color ?? '#475569',
                  }}
                >
                  {c.name.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold leading-tight">
                    {c.name}
                  </div>
                  {c.color && (
                    <div className="text-[11px] font-mono text-muted-foreground">
                      {c.color}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() =>
                    setEditing({ ...c, isActive: true })
                  }
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-rose-600 hover:text-rose-700"
                  onClick={() => remove(c.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? 'Редактировать категорию' : 'Новая категория'}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Название*
                </Label>
                <Input
                  value={editing.name ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Цвет
                </Label>
                <div className="mt-1 flex items-center gap-2">
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
                    className="font-mono"
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
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
