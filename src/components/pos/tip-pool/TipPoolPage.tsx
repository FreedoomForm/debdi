'use client'
/**
 * /pos/tip-pool — manager-facing tip pool dashboard.
 *
 * Inspired by Toast POS tip-share workflow. Lets the owner:
 *  • create a tip pool over a [from, to] date range (auto-aggregates
 *    CashierShift.totalTips inside the window)
 *  • assign relative weights to selected employees
 *  • mark the pool as DISTRIBUTED, locking all calculations
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Banknote,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { Field } from '@/components/pos/shared/FormPrimitives'

type Share = {
  id: string
  employeeId: string
  weight: number
  computedAmount: number
  paidOut: boolean
  paidOutAt?: string | null
}

type Pool = {
  id: string
  fromDate: string
  toDate: string
  totalAmount: number
  status: 'OPEN' | 'DISTRIBUTED' | 'CANCELED'
  notes?: string | null
  createdAt: string
  closedAt?: string | null
  shares: Share[]
}

type Employee = {
  id: string
  name: string
  role: string
  isActive: boolean
}

function formatUZS(n: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(n))} сум`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU')
}

export default function TipPoolPage() {
  const [pools, setPools] = useState<Pool[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [distributing, setDistributing] = useState<string | null>(null)

  // Form state
  const today = new Date()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [fromDate, setFromDate] = useState<string>(
    yesterday.toISOString().slice(0, 10)
  )
  const [toDate, setToDate] = useState<string>(today.toISOString().slice(0, 10))
  const [weights, setWeights] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, eRes] = await Promise.all([
        fetch('/api/pos/tip-pool', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/pos/employees', { credentials: 'include', cache: 'no-store' }),
      ])
      if (pRes.ok) {
        const data = await pRes.json()
        setPools(Array.isArray(data?.items) ? data.items : [])
      }
      if (eRes.ok) {
        const data = await eRes.json()
        setEmployees(Array.isArray(data?.items) ? data.items : [])
      }
    } catch (err) {
      toast.error(err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totals = useMemo(() => {
    let collected = 0
    let distributed = 0
    let openPools = 0
    for (const p of pools) {
      collected += p.totalAmount
      if (p.status === 'DISTRIBUTED') distributed += p.totalAmount
      if (p.status === 'OPEN') openPools++
    }
    return { collected, distributed, openPools }
  }, [pools])

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  )

  const create = async () => {
    const entries = Object.entries(weights).filter(([, w]) => w > 0)
    if (entries.length === 0) {
      toast.error('Выберите хотя бы одного сотрудника и задайте долю')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/pos/tip-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fromDate: new Date(fromDate + 'T00:00:00').toISOString(),
          toDate: new Date(toDate + 'T23:59:59').toISOString(),
          weights: entries.map(([employeeId, weight]) => ({ employeeId, weight })),
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success('Tip-пул создан')
      setCreateOpen(false)
      setWeights({})
      setNotes('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setCreating(false)
    }
  }

  const distribute = async (id: string) => {
    if (!confirm('Распределить чаевые? После этого пул нельзя редактировать.')) return
    setDistributing(id)
    try {
      const res = await fetch(`/api/pos/tip-pool/${id}/distribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success('Чаевые распределены')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setDistributing(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PosPageHeader
        title="Tip Pool"
        icon={<Wallet className="h-4 w-4 text-emerald-500" />}
        badge={pools.length}
        actions={
          <>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Новый пул
            </Button>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
              Обновить
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-[1400px] space-y-3 p-3 lg:p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <KpiTile label="Собрано" value={formatUZS(totals.collected)} tone="emerald" icon={<Banknote className="h-3 w-3" />} />
          <KpiTile label="Распределено" value={formatUZS(totals.distributed)} tone="cyan" icon={<CheckCircle2 className="h-3 w-3" />} />
          <KpiTile label="Открытых пулов" value={totals.openPools} tone={totals.openPools > 0 ? 'amber' : 'neutral'} icon={<Users className="h-3 w-3" />} />
        </div>

        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pools.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Пулов чаевых ещё нет. Создайте первый — система автоматически суммирует
              чаевые из открытых смен в указанном периоде.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pools.map((p) => (
              <Card key={p.id} className={cn(p.status === 'DISTRIBUTED' && 'opacity-80')}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm">
                      {fmtDate(p.fromDate)} — {fmtDate(p.toDate)}
                    </CardTitle>
                    <p className="mt-1 text-2xl font-bold tabular-nums">
                      {formatUZS(p.totalAmount)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      p.status === 'OPEN' && 'bg-amber-100 text-amber-800',
                      p.status === 'DISTRIBUTED' && 'bg-emerald-100 text-emerald-800',
                      p.status === 'CANCELED' && 'bg-rose-100 text-rose-800'
                    )}
                  >
                    {p.status === 'OPEN' ? 'Открыт' : p.status === 'DISTRIBUTED' ? 'Распределён' : 'Отменён'}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="space-y-1">
                    {p.shares.map((s) => {
                      const emp = employeeMap.get(s.employeeId)
                      return (
                        <li
                          key={s.id}
                          className="flex items-center justify-between rounded-md border border-border bg-card px-2 py-1.5 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">
                              {emp?.name ?? s.employeeId.slice(0, 8)}
                              {emp?.role && (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  · {emp.role}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Доля {s.weight}
                              {s.paidOut ? ' · ✓ выплачено' : ''}
                            </div>
                          </div>
                          <div className="font-bold tabular-nums">
                            {formatUZS(s.computedAmount)}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  {p.notes && (
                    <p className="rounded-md border border-dashed border-border p-2 text-[11px] text-muted-foreground">
                      {p.notes}
                    </p>
                  )}
                  {p.status === 'OPEN' && (
                    <Button
                      size="sm"
                      onClick={() => distribute(p.id)}
                      disabled={distributing === p.id}
                      className="w-full"
                    >
                      {distributing === p.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Распределить
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Новый Tip Pool</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="С даты">
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </Field>
              <Field label="По дату">
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </Field>
            </div>
            <Field label="Доли сотрудников" full>
              <div className="max-h-[260px] space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {employees.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Нет активных сотрудников
                  </p>
                ) : (
                  employees.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-2 rounded-md p-1 text-sm hover:bg-accent"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{e.name}</div>
                        <div className="text-[10px] text-muted-foreground">{e.role}</div>
                      </div>
                      <Select
                        value={String(weights[e.id] ?? 0)}
                        onValueChange={(v) =>
                          setWeights((prev) => ({ ...prev, [e.id]: Number(v) }))
                        }
                      >
                        <SelectTrigger className="h-7 w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">— нет —</SelectItem>
                          <SelectItem value="0.5">×0.5</SelectItem>
                          <SelectItem value="1">×1.0</SelectItem>
                          <SelectItem value="1.5">×1.5</SelectItem>
                          <SelectItem value="2">×2.0</SelectItem>
                          <SelectItem value="3">×3.0</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
              </div>
            </Field>
            <Field label="Заметка (необязательно)" full>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                placeholder="Например: «Tip-share смен 5–6 декабря»"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button onClick={create} disabled={creating}>
              {creating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
