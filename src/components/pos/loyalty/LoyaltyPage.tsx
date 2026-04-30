'use client'
/**
 * Loyalty program manager.
 *
 * - Settings card to toggle program on/off and tweak earn/redeem rates.
 * - Members table sorted by points (top spenders first) with quick search.
 *
 * The schema in `prisma/schema.prisma` allows tiered programs (Bronze/Silver/Gold);
 * tier management is roadmapped — this page focuses on the always-needed
 * single-tier flow first.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Award,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatCurrency, formatDateTime } from '@/lib/pos'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'

type Program = {
  id: string
  name: string
  pointsPerCurrency: number
  currencyPerPoint: number
  isActive: boolean
}

type Member = {
  id: string
  customerId: string
  points: number
  lifetimeSpent: number
  tier?: string | null
  joinedAt: string
  customer: { id: string; name: string; phone: string }
}

export function LoyaltyPage() {
  const [program, setProgram] = useState<Program | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/loyalty', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { program: Program; members: Member[] }
      setProgram(data.program)
      setMembers(data.members ?? [])
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

  const updateProgram = async (patch: Partial<Program>) => {
    setBusy(true)
    try {
      const res = await fetch('/api/pos/loyalty', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { program: Program }
      setProgram(data.program)
      toast.success('Сохранено')
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось сохранить'
      )
    } finally {
      setBusy(false)
    }
  }

  const visibleMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.customer.name.toLowerCase().includes(q) ||
        m.customer.phone.toLowerCase().includes(q)
    )
  }, [members, query])

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Программа лояльности"
        icon={<Award className="h-4 w-4 text-amber-500" />}
        backHref="/pos/terminal"
        badge={
          program ? (
            <Badge
              variant={program.isActive ? 'default' : 'secondary'}
              className={
                program.isActive
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                  : ''
              }
            >
              {program.isActive ? '● Активна' : 'Отключена'}
            </Badge>
          ) : undefined
        }
        actions={
          <Button size="icon" variant="ghost" onClick={() => load()}>
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        }
      />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {loading || !program ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Настройки программы
                </CardTitle>
                <CardDescription>
                  Баллы начисляются автоматически при оплате. 1 балл = «единица»
                  скидки при следующих покупках.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">
                      Программа активна
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Если выключено — баллы не начисляются.
                    </div>
                  </div>
                  <Switch
                    checked={program.isActive}
                    onCheckedChange={(v) => updateProgram({ isActive: v })}
                    disabled={busy}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Название
                    </Label>
                    <Input
                      defaultValue={program.name}
                      onBlur={(e) =>
                        e.target.value !== program.name &&
                        updateProgram({ name: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Баллов за 1 000 UZS
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      defaultValue={program.pointsPerCurrency}
                      onBlur={(e) => {
                        const v = Number(e.target.value)
                        if (!Number.isNaN(v) && v !== program.pointsPerCurrency)
                          updateProgram({ pointsPerCurrency: v })
                      }}
                      className="mt-1"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Текущая скорость: {program.pointsPerCurrency} балл за каждые 1 000 UZS чека.
                    </p>
                  </div>
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      1 балл = UZS
                    </Label>
                    <Input
                      type="number"
                      defaultValue={program.currencyPerPoint}
                      onBlur={(e) => {
                        const v = Number(e.target.value)
                        if (!Number.isNaN(v) && v !== program.currencyPerPoint)
                          updateProgram({ currencyPerPoint: v })
                      }}
                      className="mt-1"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Стоимость одного балла при списании.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      Участники ({members.length})
                    </CardTitle>
                    <CardDescription>
                      Топ клиентов по накоплениям
                    </CardDescription>
                  </div>
                  <div className="relative w-[260px]">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Имя или телефон"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="h-9 pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {visibleMembers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Пока нет участников. Они добавятся автоматически после
                    первой покупки клиента.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary text-[11px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">Клиент</th>
                          <th className="px-3 py-2 text-left">Уровень</th>
                          <th className="px-3 py-2 text-right">Баллы</th>
                          <th className="px-3 py-2 text-right">Потрачено</th>
                          <th className="px-3 py-2 text-right">Регистрация</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {visibleMembers.map((m) => (
                          <tr key={m.id} className="hover:bg-accent/30">
                            <td className="px-3 py-2">
                              <div className="font-medium">{m.customer.name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {m.customer.phone}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {m.tier ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-amber-100 text-amber-700"
                                >
                                  {m.tier}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-bold">
                              {m.points}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatCurrency(m.lifetimeSpent, 'UZS')}
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-muted-foreground tabular-nums">
                              {formatDateTime(m.joinedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
