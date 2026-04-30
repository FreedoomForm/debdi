'use client'
/**
 * Employees roster — read-only view of staff under the current owner.
 *
 * Mostly informational: shows role, status, salary, current shift state.
 * Editing is delegated to the existing /middle-admin admins tab so we
 * don't duplicate role-management logic.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  User,
  UserCog,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/pos'

type Employee = {
  id: string
  email: string
  name: string
  role:
    | 'SUPER_ADMIN'
    | 'MIDDLE_ADMIN'
    | 'LOW_ADMIN'
    | 'COURIER'
    | 'WORKER'
  isActive: boolean
  salary: number
  phone?: string | null
  isOnShift: boolean
  shiftStartedAt?: string | null
  averageDeliveryMinutes?: number | null
}

const ROLE_META: Record<
  Employee['role'],
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  SUPER_ADMIN: {
    label: 'Супер-админ',
    icon: ShieldCheck,
    tone: 'bg-rose-100 text-rose-700',
  },
  MIDDLE_ADMIN: {
    label: 'Управляющий',
    icon: UserCog,
    tone: 'bg-amber-100 text-amber-700',
  },
  LOW_ADMIN: {
    label: 'Кассир',
    icon: User,
    tone: 'bg-blue-100 text-blue-700',
  },
  WORKER: {
    label: 'Сотрудник',
    icon: User,
    tone: 'bg-slate-100 text-slate-700',
  },
  COURIER: {
    label: 'Курьер',
    icon: Truck,
    tone: 'bg-emerald-100 text-emerald-700',
  },
}

export function EmployeesPage() {
  const [items, setItems] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'on-shift'>('all')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/employees', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: Employee[] }
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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((e) => {
      if (filter === 'active' && !e.isActive) return false
      if (filter === 'on-shift' && !e.isOnShift) return false
      if (!q) return true
      return (
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.phone ?? '').toLowerCase().includes(q)
      )
    })
  }, [items, filter, query])

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-12 items-center justify-between border-b border-border bg-card px-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/pos/dashboard" aria-label="Назад">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Users className="h-4 w-4 text-amber-500" />
          <h1 className="text-sm font-semibold">Сотрудники</h1>
          <Badge variant="secondary" className="text-[10px]">
            {visible.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/middle-admin">Управление ролями</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw
              className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')}
            />
            Обновить
          </Button>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Имя, email, телефон"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        {(['all', 'active', 'on-shift'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition',
              filter === f
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-card text-muted-foreground hover:bg-accent'
            )}
          >
            {f === 'all'
              ? 'Все'
              : f === 'active'
                ? 'Активные'
                : 'На смене'}
          </button>
        ))}
      </div>

      <main className="px-3 py-3">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Никого не найдено.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((e) => {
              const meta = ROLE_META[e.role]
              const Icon = meta.icon
              return (
                <article
                  key={e.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <header className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'grid h-9 w-9 place-items-center rounded-md',
                          meta.tone
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold leading-tight">
                          {e.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {meta.label}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px]',
                        e.isOnShift
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          : e.isActive
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-rose-100 text-rose-700'
                      )}
                    >
                      {e.isOnShift
                        ? '● На смене'
                        : e.isActive
                          ? 'Свободен'
                          : 'Заблокирован'}
                    </Badge>
                  </header>

                  <dl className="mt-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <dt>Email</dt>
                      <dd className="truncate text-foreground">{e.email}</dd>
                    </div>
                    {e.phone && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <dt className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Телефон
                        </dt>
                        <dd className="text-foreground">
                          <a
                            href={`tel:${e.phone}`}
                            className="hover:underline"
                          >
                            {e.phone}
                          </a>
                        </dd>
                      </div>
                    )}
                    {e.salary > 0 && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <dt>Зарплата</dt>
                        <dd className="font-medium text-foreground tabular-nums">
                          {formatCurrency(e.salary, 'UZS')}
                        </dd>
                      </div>
                    )}
                    {e.role === 'COURIER' &&
                      typeof e.averageDeliveryMinutes === 'number' && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <dt>Средняя доставка</dt>
                          <dd className="text-foreground tabular-nums">
                            {Math.round(e.averageDeliveryMinutes)} мин
                          </dd>
                        </div>
                      )}
                  </dl>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
