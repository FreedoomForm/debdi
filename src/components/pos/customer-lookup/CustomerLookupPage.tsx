'use client'
/**
 * /pos/customer-lookup — fast customer lookup page.
 *
 * Surfaces /api/pos/customers/search which previously was only used by the
 * terminal's customer picker dialog. Adds:
 *   - dedicated full-page UI with debounce
 *   - per-customer KPI summary (orders, lifetime spend, loyalty points)
 *   - one-click "Открыть в терминале" (sets focus query in /pos/terminal)
 *   - filter chips: VIP (top spenders), with debt, recent (7 days)
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Award,
  Loader2,
  Phone,
  Search,
  Sparkles,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { formatCurrency } from '@/lib/pos'

type Customer = {
  id: string
  name: string
  nickName?: string | null
  phone?: string | null
  balance: number
  totalSpent: number
  totalOrders: number
  lastOrderAt?: string | null
  loyaltyMember?: {
    points: number
    tier?: string | null
    lifetimeSpent: number
  } | null
}

type Filter = 'all' | 'vip' | 'debt' | 'recent'

export default function CustomerLookupPage() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      const res = await fetch(`/api/pos/customers/search?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: Customer[] }
      setItems(data.items ?? [])
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(query.trim()), 250)
    return () => clearTimeout(t)
  }, [query, load])

  const stats = useMemo(() => {
    let total = 0
    let lifetime = 0
    let inDebt = 0
    let withLoyalty = 0
    for (const c of items) {
      total += 1
      lifetime += c.totalSpent ?? 0
      if (c.balance < 0) inDebt += 1
      if (c.loyaltyMember) withLoyalty += 1
    }
    return { total, lifetime, inDebt, withLoyalty }
  }, [items])

  const visible = useMemo(() => {
    if (filter === 'all') return items
    if (filter === 'debt') return items.filter((c) => c.balance < 0)
    if (filter === 'vip') {
      return [...items]
        .sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0))
        .slice(0, 10)
    }
    if (filter === 'recent') {
      const since = Date.now() - 7 * 86_400_000
      return items.filter(
        (c) => c.lastOrderAt && new Date(c.lastOrderAt).getTime() >= since
      )
    }
    return items
  }, [items, filter])

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Поиск клиентов"
        icon={<Users className="h-4 w-4 text-cyan-500" />}
        backHref="/pos/clients"
        actions={<RefreshButton onClick={() => load(query.trim())} loading={loading} />}
      />

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <Card>
          <CardContent className="space-y-3 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Имя, никнейм или телефон…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 pl-10 text-base"
                autoFocus
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: 'all', label: 'Все', icon: User },
                  { id: 'vip', label: 'Топ-10 VIP', icon: Sparkles },
                  { id: 'debt', label: 'С долгами', icon: AlertTriangle },
                  { id: 'recent', label: 'Активны 7 дн', icon: Wallet },
                ] as Array<{ id: Filter; label: string; icon: typeof User }>
              ).map((f) => {
                const active = filter === f.id
                const Icon = f.icon
                return (
                  <Button
                    key={f.id}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    onClick={() => setFilter(f.id)}
                  >
                    <Icon className="mr-1 h-3.5 w-3.5" />
                    {f.label}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            label="Найдено"
            value={String(stats.total)}
            icon={<Users className="h-4 w-4" />}
            tone="cyan"
            hint="По текущему запросу"
          />
          <KpiTile
            label="Lifetime"
            value={formatCurrency(stats.lifetime, 'UZS')}
            icon={<Wallet className="h-4 w-4" />}
            tone="emerald"
            hint="Сумма всех чеков"
          />
          <KpiTile
            label="С долгами"
            value={String(stats.inDebt)}
            icon={<AlertTriangle className="h-4 w-4" />}
            tone={stats.inDebt > 0 ? 'rose' : 'neutral'}
            hint="Отрицательный баланс"
          />
          <KpiTile
            label="В программе лояльности"
            value={String(stats.withLoyalty)}
            icon={<Award className="h-4 w-4" />}
            tone="amber"
            hint="Активных участников"
          />
        </div>

        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {items.length === 0
                ? 'Клиенты не найдены — попробуйте изменить запрос.'
                : 'Под выбранный фильтр клиентов нет.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {visible.map((c) => {
              const inDebt = c.balance < 0
              const loyalty = c.loyaltyMember
              return (
                <Card key={c.id} className="hover:shadow-md transition">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-50 text-cyan-700">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {c.name}
                          {c.nickName && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({c.nickName})
                            </span>
                          )}
                        </span>
                        {loyalty && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 text-[10px]"
                          >
                            <Award className="mr-1 h-3 w-3" />
                            {loyalty.tier ?? 'участник'} · {loyalty.points} б
                          </Badge>
                        )}
                        {inDebt && (
                          <Badge
                            variant="secondary"
                            className="bg-rose-100 text-rose-800 text-[10px]"
                          >
                            долг {formatCurrency(Math.abs(c.balance), 'UZS')}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </a>
                        )}
                        <span>
                          {c.totalOrders} чеков ·{' '}
                          {formatCurrency(c.totalSpent, 'UZS')} lifetime
                        </span>
                        {c.lastOrderAt && (
                          <span>
                            Последний{' '}
                            {new Date(c.lastOrderAt).toLocaleDateString('ru-RU')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs"
                      >
                        <Link
                          href={`/pos/clients?focus=${encodeURIComponent(c.id)}`}
                        >
                          Профиль
                        </Link>
                      </Button>
                      <Button asChild size="sm" className="h-8 px-2 text-xs">
                        <Link
                          href={`/pos/terminal?customerId=${encodeURIComponent(
                            c.id
                          )}`}
                        >
                          В терминал
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
