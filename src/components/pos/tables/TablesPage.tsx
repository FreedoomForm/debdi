'use client'
/**
 * Floor plan / Tables management page.
 *
 * Renders an interactive floor plan where tables can be tapped to view
 * status, drag-positioned (admin), and switched between
 * AVAILABLE/OCCUPIED/RESERVED/CLEANING/BLOCKED.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  X,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import type { PosTable, TableStatusValue } from '@/lib/pos'

const STATUS_META: Record<
  TableStatusValue,
  { label: string; color: string; bg: string; ring: string }
> = {
  AVAILABLE: {
    label: 'Свободен',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
    ring: 'ring-emerald-300',
  },
  OCCUPIED: {
    label: 'Занят',
    color: 'text-red-700',
    bg: 'bg-red-100',
    ring: 'ring-red-300',
  },
  RESERVED: {
    label: 'Бронь',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    ring: 'ring-amber-300',
  },
  CLEANING: {
    label: 'Уборка',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    ring: 'ring-blue-300',
  },
  BLOCKED: {
    label: 'Заблок.',
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    ring: 'ring-slate-300',
  },
}

type Section = { id: string; name: string; color?: string | null; sortOrder: number }

export function TablesPage() {
  const [tables, setTables] = useState<PosTable[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [activeSection, setActiveSection] = useState<string | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    capacity: 4,
    sectionId: '',
  })
  const [selected, setSelected] = useState<PosTable | null>(null)
  const dragRef = useRef<{ id: string; offX: number; offY: number } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/tables', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { tables: PosTable[]; sections: Section[] }
      setTables(data.tables ?? [])
      setSections(data.sections ?? [])
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

  const visibleTables = useMemo(() => {
    if (activeSection === 'all') return tables
    return tables.filter((t) => t.sectionId === activeSection)
  }, [tables, activeSection])

  const handleStatusChange = async (
    id: string,
    status: TableStatusValue
  ) => {
    setSelected(null)
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    )
    try {
      const res = await fetch(`/api/pos/tables/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось обновить'
      )
      load()
    }
  }

  const handleCreate = async () => {
    if (!createForm.name.trim()) return
    try {
      const res = await fetch('/api/pos/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: createForm.name.trim(),
          capacity: createForm.capacity,
          sectionId: createForm.sectionId || null,
          positionX: 80 + Math.random() * 200,
          positionY: 80 + Math.random() * 200,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Стол добавлен')
      setCreateOpen(false)
      setCreateForm({ name: '', capacity: 4, sectionId: '' })
      load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось создать'
      )
    }
  }

  const handleDragStart = (e: React.PointerEvent, table: PosTable) => {
    if (!editMode) return
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    dragRef.current = {
      id: table.id,
      offX: e.clientX - rect.left,
      offY: e.clientY - rect.top,
    }
    target.setPointerCapture(e.pointerId)
  }

  const handleDragMove = (e: React.PointerEvent) => {
    if (!editMode || !dragRef.current) return
    const drag = dragRef.current
    const container = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const newX = e.clientX - container.left - drag.offX
    const newY = e.clientY - container.top - drag.offY
    setTables((prev) =>
      prev.map((t) =>
        t.id === drag.id
          ? { ...t, positionX: Math.max(0, newX), positionY: Math.max(0, newY) }
          : t
      )
    )
  }

  const handleDragEnd = async (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const id = dragRef.current.id
    const target = tables.find((t) => t.id === id)
    dragRef.current = null
    if (!target) return
    try {
      await fetch(`/api/pos/tables/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          positionX: target.positionX,
          positionY: target.positionY,
        }),
      })
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col bg-background">
      <PosPageHeader
        title="Залы и столы"
        backHref="/pos/terminal"
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant={editMode ? 'default' : 'outline'}
              onClick={() => setEditMode((v) => !v)}
            >
              {editMode ? (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Готово
                </>
              ) : (
                <>
                  <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Редактировать
                </>
              )}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Стол
            </Button>
            <Button size="icon" variant="ghost" onClick={() => load()}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </>
        }
      />

      {/* Section chips */}
      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border bg-card px-3 py-2">
        <SectionChip
          label="Все"
          active={activeSection === 'all'}
          onClick={() => setActiveSection('all')}
          count={tables.length}
        />
        {sections.map((s) => (
          <SectionChip
            key={s.id}
            label={s.name}
            active={activeSection === s.id}
            onClick={() => setActiveSection(s.id)}
            color={s.color}
            count={tables.filter((t) => t.sectionId === s.id).length}
          />
        ))}
      </div>

      {/* Floor plan area */}
      <div
        className="relative flex-1 overflow-auto bg-[radial-gradient(circle_at_1px_1px,hsl(var(--border))_1px,transparent_0)] bg-[length:24px_24px]"
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      >
        {loading ? (
          <div className="absolute inset-0 grid place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visibleTables.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-sm font-medium">Нет столов в этом зале</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Нажмите «Стол», чтобы добавить новый.
              </p>
            </div>
          </div>
        ) : (
          visibleTables.map((t) => (
            <TableNode
              key={t.id}
              table={t}
              editMode={editMode}
              onPointerDown={(e) => handleDragStart(e, t)}
              onClick={() => !editMode && setSelected(t)}
            />
          ))
        )}
      </div>

      {/* Status legend */}
      <footer className="flex shrink-0 items-center gap-3 border-t border-border bg-card px-3 py-2">
        {(Object.keys(STATUS_META) as TableStatusValue[]).map((s) => {
          const meta = STATUS_META[s]
          return (
            <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn('h-3 w-3 rounded-sm', meta.bg, meta.ring, 'ring-1')}
              />
              {meta.label}
            </div>
          )
        })}
      </footer>

      {/* Status change dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Стол {selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Вместимость: {selected.capacity}</span>
                <Badge
                  variant="secondary"
                  className={cn(STATUS_META[selected.status].bg, STATUS_META[selected.status].color)}
                >
                  {STATUS_META[selected.status].label}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(STATUS_META) as TableStatusValue[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={selected.status === s}
                    onClick={() => handleStatusChange(selected.id, s)}
                    className={cn(
                      'rounded-md border px-3 py-2 text-sm font-medium transition',
                      selected.status === s
                        ? 'border-foreground bg-foreground/5'
                        : 'border-border bg-card hover:border-foreground/40'
                    )}
                  >
                    <span className={cn('mr-1.5 inline-block h-2.5 w-2.5 rounded-full', STATUS_META[s].bg)} />
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
              <Link
                href={`/pos/terminal?tableId=${selected.id}`}
                className="block w-full rounded-md bg-foreground px-3 py-2 text-center text-sm font-medium text-background hover:bg-foreground/90"
              >
                Открыть заказ
              </Link>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              <X className="mr-1.5 h-4 w-4" /> Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Новый стол</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Название</Label>
              <Input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="напр. T1, Бар-3"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Вместимость</Label>
              <Input
                type="number"
                min={1}
                value={createForm.capacity}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    capacity: Number(e.target.value) || 1,
                  }))
                }
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={!createForm.name.trim()}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SectionChip({
  label,
  active,
  onClick,
  color,
  count,
}: {
  label: string
  active: boolean
  onClick: () => void
  color?: string | null
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
      style={
        active && color
          ? { backgroundColor: color, borderColor: color, color: '#fff' }
          : undefined
      }
    >
      {label}
      {typeof count === 'number' && (
        <span
          className={cn(
            'tabular-nums opacity-70',
            !active && 'rounded-full bg-muted px-1.5 py-0.5 text-[10px]'
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function TableNode({
  table,
  editMode,
  onClick,
  onPointerDown,
}: {
  table: PosTable
  editMode: boolean
  onClick: () => void
  onPointerDown: (e: React.PointerEvent) => void
}) {
  const meta = STATUS_META[table.status]
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      className={cn(
        'absolute flex flex-col items-center justify-center rounded-xl border-2 shadow-md transition select-none',
        meta.bg,
        meta.color,
        'border-current/20',
        editMode && 'cursor-grab active:cursor-grabbing ring-2 ring-foreground/30',
        !editMode && 'hover:scale-[1.04]'
      )}
      style={{
        left: table.positionX,
        top: table.positionY,
        width: table.width,
        height: table.height,
        borderRadius: table.shape === 'circle' ? '50%' : 12,
      }}
      aria-label={`Стол ${table.name}, ${meta.label}`}
    >
      <span className="text-base font-bold leading-none">{table.name}</span>
      <span className="mt-0.5 flex items-center gap-1 text-[10px] opacity-75">
        <Users className="h-2.5 w-2.5" /> {table.capacity}
      </span>
      <span className="mt-0.5 text-[9px] uppercase tracking-wider opacity-70">
        {meta.label}
      </span>
    </button>
  )
}
