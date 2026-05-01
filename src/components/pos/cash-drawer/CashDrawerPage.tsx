'use client'
/**
 * /pos/cash-drawer — modern cash drawer movements page.
 *
 * Surfaces /api/pos/cash-drawer (GET + POST) which previously had no UI.
 * Lets the cashier view all movements for the active shift, classify them
 * (PAID_IN / PAID_OUT / DROP / CHANGE_FUND / ADJUSTMENT) and add new ones
 * with a typed reason. Also pulls the active shift list from /api/pos/shifts
 * so the user can switch between shifts.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CircleDollarSign,
  Loader2,
  Plus,
  Settings,
  Vault,
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
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { formatCurrency } from '@/lib/pos'

type MoveType = 'PAID_IN' | 'PAID_OUT' | 'DROP' | 'CHANGE_FUND' | 'ADJUSTMENT'

type Movement = {
  id: string
  shiftId: string
  type: MoveType
  amount: number
  reason?: string | null
  performedBy?: string | null
  createdAt: string
}

type Shift = {
  id: string
  status: 'OPEN' | 'CLOSED'
  openedAt: string
  closedAt?: string | null
  openingFloat: number
  closingCash?: number | null
  cashierId?: string | null
}

const TYPE_META: Record<
  MoveType,
  { label: string; tone: string; icon: typeof Wallet; sign: 'positive' | 'negative' | 'neutral' }
> = {
  PAID_IN: {
    label: 'Внесение',
    tone: 'bg-emerald-100 text-emerald-800',
    icon: ArrowDownCircle,
    sign: 'positive',
  },
  PAID_OUT: {
    label: 'Выплата',
    tone: 'bg-rose-100 text-rose-800',
    icon: ArrowUpCircle,
    sign: 'negative',
  },
  DROP: {
    label: 'Инкассация',
    tone: 'bg-violet-100 text-violet-800',
    icon: Vault,
    sign: 'negative',
  },
  CHANGE_FUND: {
    label: 'Размен',
    tone: 'bg-amber-100 text-amber-800',
    icon: CircleDollarSign,
    sign: 'positive',
  },
  ADJUSTMENT: {
    label: 'Коррекция',
    tone: 'bg-slate-100 text-slate-800',
    icon: Settings,
    sign: 'neutral',
  },
}

const TYPES: MoveType[] = ['PAID_IN', 'PAID_OUT', 'DROP', 'CHANGE_FUND', 'ADJUSTMENT']

export default function CashDrawerPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [shiftId, setShiftId] = useState<string | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<{
    type: MoveType
    amount: string
    reason: string
  }>({ type: 'PAID_IN', amount: '', reason: '' })
  const [busy, setBusy] = useState(false)

  const loadShifts = useCallback(async () => {
    try {
      // Fetch the most recent shifts; `requirePosAuth` resolves the cashier scope.
      const res = await fetch('/api/pos/shifts', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: Shift[] }
      const list = data.items ?? []
      setShifts(list)
      if (!shiftId && list.length > 0) {
        // Prefer the open shift, else the most recent one.
        const open = list.find((s) => s.status === 'OPEN')
        setShiftId(open?.id ?? list[0].id)
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка смен: ${err.message}` : 'Не удалось загрузить смены'
      )
    }
  }, [shiftId])

  const loadMovements = useCallback(async () => {
    if (!shiftId) {
      setMovements([])
      setLoading(false)
      return
    }
    try {
      const res = await fetch(
        `/api/pos/cash-drawer?shiftId=${encodeURIComponent(shiftId)}`,
        { credentials: 'include', cache: 'no-store' }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: Movement[] }
      setMovements(data.items ?? [])
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить движения'
      )
    } finally {
      setLoading(false)
    }
  }, [shiftId])

  useEffect(() => {
    loadShifts()
  }, [loadShifts])

  useEffect(() => {
    loadMovements()
  }, [loadMovements])

  const refresh = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadShifts(), loadMovements()])
  }, [loadShifts, loadMovements])

  const activeShift = useMemo(
    () => shifts.find((s) => s.id === shiftId) ?? null,
    [shifts, shiftId]
  )

  const stats = useMemo(() => {
    let paidIn = 0
    let paidOut = 0
    let drops = 0
    let changeFund = 0
    let adjustments = 0
    for (const m of movements) {
      if (m.type === 'PAID_IN') paidIn += Math.abs(m.amount)
      else if (m.type === 'PAID_OUT') paidOut += Math.abs(m.amount)
      else if (m.type === 'DROP') drops += Math.abs(m.amount)
      else if (m.type === 'CHANGE_FUND') changeFund += Math.abs(m.amount)
      else if (m.type === 'ADJUSTMENT') adjustments += m.amount
    }
    const expected =
      (activeShift?.openingFloat ?? 0) +
      paidIn +
      changeFund +
      adjustments -
      paidOut -
      drops
    return { paidIn, paidOut, drops, changeFund, adjustments, expected }
  }, [movements, activeShift])

  const submit = async () => {
    if (!shiftId) {
      toast.error('Выберите смену')
      return
    }
    const amt = Number(form.amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Укажите сумму больше 0')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/pos/cash-drawer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shiftId,
          type: form.type,
          amount: amt,
          reason: form.reason.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success(`Зафиксировано: ${TYPE_META[form.type].label}`)
      setCreateOpen(false)
      setForm({ type: 'PAID_IN', amount: '', reason: '' })
      await loadMovements()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Кассовый ящик"
        icon={<Vault className="h-4 w-4 text-amber-500" />}
        backHref="/pos/finance"
        badge={activeShift?.status === 'OPEN' ? '● Смена открыта' : undefined}
        actions={
          <>
            <RefreshButton onClick={refresh} loading={loading} />
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              disabled={!shiftId}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Движение
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 p-3">
            <div className="flex-1 min-w-[240px]">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Смена
              </Label>
              <Select
                value={shiftId ?? ''}
                onValueChange={(v) => setShiftId(v)}
                disabled={shifts.length === 0}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Смены не найдены" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.status === 'OPEN' ? '● ' : ''}
                      {new Date(s.openedAt).toLocaleString('ru-RU')}
                      {s.status === 'CLOSED' && s.closedAt
                        ? ` — закрыта ${new Date(s.closedAt).toLocaleTimeString('ru-RU')}`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Стартовый разменный фонд
              </div>
              <div className="mt-1 text-lg font-bold tabular-nums">
                {activeShift
                  ? formatCurrency(activeShift.openingFloat ?? 0, 'UZS')
                  : '—'}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            label="Внесения"
            value={formatCurrency(stats.paidIn, 'UZS')}
            icon={<ArrowDownCircle className="h-4 w-4" />}
            tone="emerald"
            hint="PAID_IN"
          />
          <KpiTile
            label="Выплаты"
            value={formatCurrency(stats.paidOut, 'UZS')}
            icon={<ArrowUpCircle className="h-4 w-4" />}
            tone={stats.paidOut > 0 ? 'rose' : 'neutral'}
            hint="PAID_OUT"
          />
          <KpiTile
            label="Инкассация"
            value={formatCurrency(stats.drops, 'UZS')}
            icon={<Vault className="h-4 w-4" />}
            tone={stats.drops > 0 ? 'violet' : 'neutral'}
            hint="DROP"
          />
          <KpiTile
            label="Ожидаемая касса"
            value={formatCurrency(stats.expected, 'UZS')}
            icon={<Wallet className="h-4 w-4" />}
            tone="amber"
            hint="float + in - out - drop"
          />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Движения ({movements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="grid place-items-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : movements.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                {shiftId
                  ? 'По этой смене ещё нет движений по кассе.'
                  : 'Сначала откройте или выберите смену в /pos/shift.'}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {movements.map((m) => {
                  const meta = TYPE_META[m.type]
                  const Icon = meta.icon
                  return (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-accent/40"
                    >
                      <div
                        className={cn(
                          'grid h-9 w-9 place-items-center rounded-md',
                          meta.tone
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px]', meta.tone)}
                          >
                            {meta.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(m.createdAt).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        {m.reason && (
                          <p className="mt-0.5 line-clamp-1 text-xs italic text-muted-foreground">
                            {m.reason}
                          </p>
                        )}
                      </div>
                      <div
                        className={cn(
                          'shrink-0 text-base font-bold tabular-nums',
                          meta.sign === 'positive' && 'text-emerald-700',
                          meta.sign === 'negative' && 'text-rose-700',
                          meta.sign === 'neutral' && 'text-foreground'
                        )}
                      >
                        {meta.sign === 'negative' ? '−' : meta.sign === 'positive' ? '+' : ''}
                        {formatCurrency(Math.abs(m.amount), 'UZS')}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новое движение по кассе</DialogTitle>
            <DialogDescription>
              Зафиксируйте внесение, выплату, инкассацию, размен или коррекцию.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Тип</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, type: v as MoveType }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_META[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Сумма (UZS)*</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount: e.target.value }))
                }
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Комментарий</Label>
              <Textarea
                value={form.reason}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reason: e.target.value }))
                }
                placeholder="Например: возврат поставщику, размен на 1000 UZS, инкассация в банк"
                className="mt-1 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
