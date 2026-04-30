'use client'
/**
 * Table picker dialog — opened from the cart panel when serviceMode is
 * DINE_IN. Lists tables grouped by section, indicates current status, and
 * lets the cashier attach a table to the current order.
 */
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Utensils, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { PosTable, TableStatusValue } from '@/lib/pos'

const STATUS_TONE: Record<TableStatusValue, string> = {
  AVAILABLE: 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
  OCCUPIED: 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100',
  RESERVED: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
  CLEANING: 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100',
  BLOCKED: 'border-slate-300 bg-slate-100 text-slate-700',
}

type Section = { id: string; name: string; color?: string | null }

type Props = {
  selectedId?: string | null
  onSelect: (tableId: string | null, guestCount?: number | null) => void
}

export function TablePickerDialog({ selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [tables, setTables] = useState<PosTable[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<string | 'all'>('all')
  const [guestCount, setGuestCount] = useState('')

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('pos:open-table-picker', handler)
    return () => window.removeEventListener('pos:open-table-picker', handler)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pos/tables', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { tables: PosTable[]; sections: Section[] }
      setTables(data.tables ?? [])
      setSections(data.sections ?? [])
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const visible =
    activeSection === 'all'
      ? tables
      : tables.filter((t) => t.sectionId === activeSection)

  const handleSelect = (id: string | null) => {
    const guests = guestCount ? Number(guestCount) || null : null
    onSelect(id, guests)
    setOpen(false)
    setGuestCount('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Выбрать стол
          </DialogTitle>
          <DialogDescription>
            Свободные столы выделены зелёным.
          </DialogDescription>
        </DialogHeader>

        {/* Section chips */}
        {sections.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <SectionChip
              label="Все"
              active={activeSection === 'all'}
              onClick={() => setActiveSection('all')}
            />
            {sections.map((s) => (
              <SectionChip
                key={s.id}
                label={s.name}
                active={activeSection === s.id}
                onClick={() => setActiveSection(s.id)}
                color={s.color}
              />
            ))}
          </div>
        )}

        {/* Guest count */}
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Гостей
          </Label>
          <Input
            type="number"
            min={1}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            placeholder="не задано"
            className="mt-1 h-9"
          />
        </div>

        <ScrollArea className="h-[320px] rounded-md border border-border p-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : visible.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Нет столов в этом зале.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {visible.map((t) => {
                const isSelected = t.id === selectedId
                const tone = STATUS_TONE[t.status]
                const isBlocked = t.status === 'BLOCKED'
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={isBlocked}
                    onClick={() => handleSelect(t.id)}
                    className={cn(
                      'aspect-square rounded-lg border-2 p-2 text-left transition',
                      tone,
                      isSelected && 'ring-2 ring-foreground',
                      isBlocked && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <div className="flex h-full flex-col items-start justify-between">
                      <div className="text-base font-bold">{t.name}</div>
                      <div className="text-[10px] uppercase tracking-wider opacity-70">
                        {t.capacity} мест
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => handleSelect(null)}>
            <X className="mr-1.5 h-4 w-4" />
            Без стола
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SectionChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string
  active: boolean
  onClick: () => void
  color?: string | null
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition',
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
    </button>
  )
}
