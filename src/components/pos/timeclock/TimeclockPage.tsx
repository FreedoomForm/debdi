'use client'
/**
 * Employee timeclock — clock-in / clock-out with running timer.
 *
 * Workers (LOW_ADMIN / WORKER / COURIER) start their shift here at the
 * beginning of the day; the page shows the elapsed time live and a list
 * of recent closed entries with computed durations.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Clock,
  Coffee,
  Loader2,
  PlayCircle,
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
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { formatDateTime } from '@/lib/pos'

type Entry = {
  id: string
  clockedInAt: string
  clockedOutAt?: string | null
  breakMinutes: number
  notes?: string | null
}

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}ч ${m.toString().padStart(2, '0')}м`
  return `${m}м`
}

export function TimeclockPage() {
  const [open, setOpen] = useState<Entry | null>(null)
  const [history, setHistory] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [breakMinutes, setBreakMinutes] = useState('')
  const [notes, setNotes] = useState('')
  const [now, setNow] = useState(Date.now())

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/timeclock', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { open: Entry | null; history: Entry[] }
      setOpen(data.open ?? null)
      setHistory(data.history ?? [])
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

  // Tick clock every second when shift is open.
  useEffect(() => {
    if (!open) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [open])

  const elapsedMs = useMemo(() => {
    if (!open) return 0
    return now - new Date(open.clockedInAt).getTime() - open.breakMinutes * 60000
  }, [open, now])

  const clockIn = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/pos/timeclock', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Смена начата')
      load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось'
      )
    } finally {
      setBusy(false)
    }
  }

  const clockOut = async () => {
    if (!open) return
    setBusy(true)
    try {
      const res = await fetch('/api/pos/timeclock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entryId: open.id,
          breakMinutes: Number(breakMinutes) || 0,
          notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Смена завершена')
      setBreakMinutes('')
      setNotes('')
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
        title="Учёт рабочего времени"
        icon={<Clock className="h-4 w-4 text-amber-500" />}
        badge={
          open ? (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              ● На смене
            </Badge>
          ) : undefined
        }
        actions={
          <RefreshButton onClick={load} loading={loading} variant="ghost" size="icon" label={null} />
        }
      />

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
                На смене
              </CardTitle>
              <CardDescription>
                Начало:{' '}
                <span className="font-medium text-foreground">
                  {formatDateTime(open.clockedInAt)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-card p-6 text-center">
                <div className="text-[11px] uppercase tracking-wider text-emerald-700">
                  Прошло
                </div>
                <div className="mt-1 font-mono text-5xl font-extrabold tabular-nums text-emerald-900">
                  {formatDuration(elapsedMs)}
                </div>
                {open.breakMinutes > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700">
                    <Coffee className="h-3 w-3" />
                    Перерыв: {open.breakMinutes} мин
                  </div>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Перерыв (минут)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(e.target.value)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Комментарий
                  </Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={clockOut}
                    disabled={busy}
                    className="h-10 bg-rose-600 text-white hover:bg-rose-700"
                  >
                    {busy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <StopCircle className="mr-2 h-4 w-4" />
                    )}
                    Завершить
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-emerald-600" />
                Начать смену
              </CardTitle>
              <CardDescription>
                Нажмите кнопку ниже, чтобы отметить начало рабочего дня.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={clockIn}
                disabled={busy}
                size="lg"
                className="h-12 bg-emerald-600 px-8 text-white hover:bg-emerald-700"
              >
                {busy ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <PlayCircle className="mr-2 h-5 w-5" />
                )}
                Начать смену
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">История</CardTitle>
            <CardDescription>Последние 30 завершённых смен</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Пока нет данных.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Начало</th>
                      <th className="px-3 py-2 text-left">Конец</th>
                      <th className="px-3 py-2 text-right">Перерыв</th>
                      <th className="px-3 py-2 text-right">Длительность</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.map((e) => {
                      const ms =
                        new Date(e.clockedOutAt!).getTime() -
                        new Date(e.clockedInAt).getTime() -
                        (e.breakMinutes || 0) * 60000
                      return (
                        <tr key={e.id} className="hover:bg-accent/30">
                          <td className="px-3 py-2 tabular-nums">
                            {formatDateTime(e.clockedInAt)}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {e.clockedOutAt
                              ? formatDateTime(e.clockedOutAt)
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {e.breakMinutes || 0} мин
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {formatDuration(ms)}
                          </td>
                        </tr>
                      )
                    })}
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
