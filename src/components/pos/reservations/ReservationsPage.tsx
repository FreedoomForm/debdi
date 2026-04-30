'use client'
/**
 * Reservations / bookings page.
 *
 * - Date selector (defaults to today).
 * - Timeline view of upcoming reservations.
 * - Quick "+ Резерв" button to create.
 *
 * For complex multi-week views, the dashboard is the better entry-point;
 * this page is optimised for the daily host workflow at a restaurant.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  Phone,
  Plus,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
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
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { formatTime, type PosTable } from '@/lib/pos'

type Reservation = {
  id: string
  customerName: string
  customerPhone?: string | null
  partySize: number
  startsAt: string
  durationMin: number
  status:
    | 'BOOKED'
    | 'CONFIRMED'
    | 'ARRIVED'
    | 'SEATED'
    | 'COMPLETED'
    | 'CANCELED'
    | 'NO_SHOW'
  notes?: string | null
  table?: PosTable | null
  tableId?: string | null
}

const STATUS_LABELS: Record<Reservation['status'], { label: string; tone: string }> = {
  BOOKED: { label: 'Забронирован', tone: 'bg-blue-100 text-blue-700' },
  CONFIRMED: { label: 'Подтверждён', tone: 'bg-emerald-100 text-emerald-700' },
  ARRIVED: { label: 'Пришёл', tone: 'bg-amber-100 text-amber-700' },
  SEATED: { label: 'За столом', tone: 'bg-violet-100 text-violet-700' },
  COMPLETED: { label: 'Завершён', tone: 'bg-slate-100 text-slate-700' },
  CANCELED: { label: 'Отменён', tone: 'bg-rose-100 text-rose-700' },
  NO_SHOW: { label: 'Не пришёл', tone: 'bg-rose-100 text-rose-700' },
}

const EMPTY_FORM = {
  customerName: '',
  customerPhone: '',
  partySize: 2,
  startsAt: '',
  durationMin: 90,
  tableId: '',
  notes: '',
}

export function ReservationsPage() {
  const [items, setItems] = useState<Reservation[]>([])
  const [tables, setTables] = useState<PosTable[]>([])
  const [date, setDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const from = new Date(date + 'T00:00:00')
      const to = new Date(date + 'T23:59:59')
      const [resRes, tblRes] = await Promise.all([
        fetch(
          `/api/pos/reservations?from=${from.toISOString()}&to=${to.toISOString()}`,
          { credentials: 'include' }
        ),
        fetch('/api/pos/tables', { credentials: 'include' }),
      ])
      const rj = (await resRes.json().catch(() => ({}))) as { items?: Reservation[] }
      const tj = (await tblRes.json().catch(() => ({}))) as { tables?: PosTable[] }
      setItems(rj.items ?? [])
      setTables(tj.tables ?? [])
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить'
      )
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    load()
  }, [load])

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      ),
    [items]
  )

  const create = async () => {
    if (!form.customerName.trim() || !form.startsAt) return
    setBusy(true)
    try {
      const res = await fetch('/api/pos/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerName: form.customerName,
          customerPhone: form.customerPhone || null,
          partySize: form.partySize,
          startsAt: new Date(form.startsAt).toISOString(),
          durationMin: form.durationMin,
          tableId: form.tableId || null,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Резерв создан')
      setCreateOpen(false)
      setForm({ ...EMPTY_FORM })
      load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Резервы"
        icon={<CalendarDays className="h-4 w-4 text-amber-500" />}
        backHref="/pos/terminal"
        badge={sortedItems.length}
        actions={
          <>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-[160px]"
            />
            <RefreshButton onClick={load} loading={loading} />
            <Button
              size="sm"
              onClick={() => {
                const now = new Date()
                now.setMinutes(now.getMinutes() + 60)
                setForm({
                  ...EMPTY_FORM,
                  startsAt: now.toISOString().slice(0, 16),
                })
                setCreateOpen(true)
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Резерв
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-5xl px-4 py-6">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedItems.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">На эту дату резервов нет</CardTitle>
              <CardDescription>
                Нажмите «Резерв» в верхней панели, чтобы создать.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {sortedItems.map((r) => {
              const meta = STATUS_LABELS[r.status]
              const start = new Date(r.startsAt)
              const end = new Date(start.getTime() + r.durationMin * 60000)
              return (
                <li key={r.id}>
                  <article className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                    <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-lg bg-amber-50 py-2 text-amber-900">
                      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider">
                        <Clock className="h-3 w-3" />
                        Время
                      </div>
                      <div className="mt-0.5 text-base font-bold tabular-nums">
                        {formatTime(start)}
                      </div>
                      <div className="text-[11px] tabular-nums opacity-70">
                        — {formatTime(end)}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {r.customerName}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px]', meta.tone)}
                        >
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {r.customerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <a
                              href={`tel:${r.customerPhone}`}
                              className="hover:text-foreground"
                            >
                              {r.customerPhone}
                            </a>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {r.partySize} гостей
                        </span>
                        {r.table && <span>· Стол {r.table.name}</span>}
                      </div>
                      {r.notes && (
                        <p className="mt-1 text-xs italic text-muted-foreground">
                          ✎ {r.notes}
                        </p>
                      )}
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Новый резерв</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Имя клиента*
              </Label>
              <Input
                value={form.customerName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, customerName: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Телефон
              </Label>
              <Input
                value={form.customerPhone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, customerPhone: e.target.value }))
                }
                placeholder="+998..."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Гостей
              </Label>
              <Input
                type="number"
                min={1}
                value={form.partySize}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    partySize: Number(e.target.value) || 1,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Начало*
              </Label>
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) =>
                  setForm((p) => ({ ...p, startsAt: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Длительность (мин)
              </Label>
              <Input
                type="number"
                min={15}
                value={form.durationMin}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    durationMin: Number(e.target.value) || 90,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Стол
              </Label>
              <Select
                value={form.tableId}
                onValueChange={(v) => setForm((p) => ({ ...p, tableId: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Без привязки" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Без привязки</SelectItem>
                  {tables.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.capacity} мест
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Заметка
              </Label>
              <Input
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="напр. День рождения, аллергия на орехи"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={busy}
            >
              <X className="mr-1.5 h-4 w-4" /> Отмена
            </Button>
            <Button
              onClick={create}
              disabled={busy || !form.customerName.trim() || !form.startsAt}
            >
              {busy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
