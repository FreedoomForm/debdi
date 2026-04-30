'use client'
/**
 * Cashier shift / register page.
 *
 * - Shows the currently OPEN shift if any (with running totals).
 * - Open form to start a new shift with cash float.
 * - Close form to reconcile cash, shows expected vs counted, calculates delta.
 * - Lists past closed shifts as a history table.
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Banknote,
  CircleDollarSign,
  Clock,
  Loader2,
  PlayCircle,
  ReceiptText,
  StopCircle,
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
import { formatCurrency, formatDateTime, type PosShift } from '@/lib/pos'
import { cn } from '@/lib/utils'

export function ShiftPage() {
  const [open, setOpen] = useState<PosShift | null>(null)
  const [history, setHistory] = useState<PosShift[]>([])
  const [loading, setLoading] = useState(true)
  const [openingFloat, setOpeningFloat] = useState('')
  const [openingNotes, setOpeningNotes] = useState('')
  const [closingCash, setClosingCash] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/shifts', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items: PosShift[]; open: PosShift | null }
      setOpen(data.open ?? null)
      setHistory((data.items ?? []).filter((s) => s.status !== 'OPEN'))
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
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const handleOpen = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/pos/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          openingFloat: Number(openingFloat) || 0,
          notes: openingNotes || null,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Смена открыта')
      setOpeningFloat('')
      setOpeningNotes('')
      load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось открыть'
      )
    } finally {
      setBusy(false)
    }
  }

  const handleClose = async () => {
    if (!open) return
    setBusy(true)
    try {
      const res = await fetch('/api/pos/shifts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shiftId: open.id,
          closingCash: Number(closingCash) || 0,
          notes: closingNotes || null,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Смена закрыта')
      setClosingCash('')
      setClosingNotes('')
      load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось закрыть'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-12 items-center justify-between border-b border-border bg-card px-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/pos/terminal" aria-label="К терминалу">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-sm font-semibold">Касса · Смена</h1>
        </div>
        <div className="text-xs text-muted-foreground">
          {open ? (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              ● Смена открыта
            </Badge>
          ) : (
            <Badge variant="secondary">Смена закрыта</Badge>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : open ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-600" />
                Текущая смена
              </CardTitle>
              <CardDescription>
                Открыта{' '}
                <span className="font-medium text-foreground">
                  {formatDateTime(open.openedAt)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  icon={<Banknote className="h-4 w-4" />}
                  label="Float"
                  value={formatCurrency(open.openingFloat, 'UZS')}
                />
                <Stat
                  icon={<CircleDollarSign className="h-4 w-4" />}
                  label="Продажи"
                  value={formatCurrency(open.totalSales, 'UZS')}
                  tone="success"
                />
                <Stat
                  icon={<ReceiptText className="h-4 w-4" />}
                  label="Заказов"
                  value={String(open.ordersCount)}
                />
                <Stat
                  icon={<CircleDollarSign className="h-4 w-4" />}
                  label="Чаевые"
                  value={formatCurrency(open.totalTips, 'UZS')}
                />
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <h3 className="mb-3 text-sm font-semibold">Закрыть смену</h3>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Наличные в кассе
                    </Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={closingCash}
                      onChange={(e) => setClosingCash(e.target.value)}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Комментарий
                    </Label>
                    <Input
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      placeholder="напр. недостача 5 000"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleClose}
                      disabled={busy || !closingCash}
                      className="h-10 bg-rose-600 text-white hover:bg-rose-700"
                    >
                      {busy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <StopCircle className="mr-2 h-4 w-4" />
                      )}
                      Закрыть смену
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-emerald-600" />
                Открыть смену
              </CardTitle>
              <CardDescription>
                Введите начальную сумму в кассе и нажмите «Открыть».
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Начальный остаток
                  </Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Комментарий
                  </Label>
                  <Input
                    value={openingNotes}
                    onChange={(e) => setOpeningNotes(e.target.value)}
                    placeholder="напр. касса №1"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleOpen}
                    disabled={busy}
                    className="h-10 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {busy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <PlayCircle className="mr-2 h-4 w-4" />
                    )}
                    Открыть смену
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">История смен</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Пока нет данных.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Открыта</th>
                      <th className="px-3 py-2 text-left">Закрыта</th>
                      <th className="px-3 py-2 text-right">Заказов</th>
                      <th className="px-3 py-2 text-right">Продажи</th>
                      <th className="px-3 py-2 text-right">Расхождение</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.map((s) => (
                      <tr key={s.id}>
                        <td className="px-3 py-2">{formatDateTime(s.openedAt)}</td>
                        <td className="px-3 py-2">
                          {s.closedAt ? formatDateTime(s.closedAt) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {s.ordersCount}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(s.totalSales, 'UZS')}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2 text-right tabular-nums',
                            (s.cashDelta ?? 0) < 0 && 'text-rose-600 font-semibold',
                            (s.cashDelta ?? 0) > 0 && 'text-emerald-600 font-semibold'
                          )}
                        >
                          {s.cashDelta == null
                            ? '—'
                            : formatCurrency(s.cashDelta, 'UZS')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: 'success'
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          'mt-1 text-base font-bold tabular-nums',
          tone === 'success' && 'text-emerald-600'
        )}
      >
        {value}
      </div>
    </div>
  )
}
