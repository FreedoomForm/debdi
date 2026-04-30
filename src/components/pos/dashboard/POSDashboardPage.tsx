'use client'
/**
 * POS Dashboard — top-level overview for store managers.
 *
 * Displays today's KPIs (revenue, orders, average ticket, items sold), a 7-day
 * revenue trend (sparkline rendered with pure SVG), top products, and quick
 * links to operational pages.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Award,
  BarChart3,
  Boxes,
  ChefHat,
  CircleDollarSign,
  Clock,
  Cog,
  CreditCard,
  FolderTree,
  Gift,
  Layers,
  Loader2,
  Monitor,
  Package,
  Percent,
  Printer,
  Receipt as ReceiptIcon,
  RefreshCw,
  ShoppingCart,
  Store,
  Timer,
  TrendingUp,
  UserCircle,
  Users,
  Utensils,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/pos'
import { LiveStrip } from './LiveStrip'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'

type SalesReport = {
  range: { from: string; to: string }
  totals: {
    gross: number
    tax: number
    discount: number
    tip: number
    count: number
    cash: number
    card: number
    transfer: number
  }
  series: Array<{ date: string; revenue: number; orders: number }>
  topProducts: Array<{
    productId: string | null
    name: string
    qty: number
    revenue: number
  }>
  averageTicket: number
}

const QUICK_LINKS: Array<{
  href: string
  label: string
  desc: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}> = [
  {
    href: '/pos/terminal',
    label: 'Терминал',
    desc: 'Открыть кассу и принимать заказы',
    icon: ShoppingCart,
    color: 'bg-amber-100 text-amber-700',
  },
  {
    href: '/pos/kds',
    label: 'KDS · Кухня',
    desc: 'Тикеты для приготовления',
    icon: ChefHat,
    color: 'bg-rose-100 text-rose-700',
  },
  {
    href: '/pos/tables',
    label: 'Столы',
    desc: 'Floor plan и резервы',
    icon: Utensils,
    color: 'bg-blue-100 text-blue-700',
  },
  {
    href: '/pos/products',
    label: 'Товары',
    desc: 'Каталог, склад, цены',
    icon: Package,
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    href: '/pos/printers',
    label: 'Принтеры',
    desc: 'Чеки, кухня, бар',
    icon: Printer,
    color: 'bg-indigo-100 text-indigo-700',
  },
  {
    href: '/pos/loyalty',
    label: 'Лояльность',
    desc: 'Программа баллов',
    icon: Award,
    color: 'bg-violet-100 text-violet-700',
  },
  {
    href: '/pos/discounts',
    label: 'Скидки',
    desc: 'Промо и купоны',
    icon: Percent,
    color: 'bg-pink-100 text-pink-700',
  },
  {
    href: '/pos/shift',
    label: 'Смены',
    desc: 'Открытие / закрытие кассы',
    icon: Clock,
    color: 'bg-teal-100 text-teal-700',
  },
  {
    href: '/pos/suppliers',
    label: 'Поставщики',
    desc: 'Закупки и приёмка',
    icon: Boxes,
    color: 'bg-orange-100 text-orange-700',
  },
  {
    href: '/pos/reservations',
    label: 'Резервы',
    desc: 'Бронь столов',
    icon: Users,
    color: 'bg-fuchsia-100 text-fuchsia-700',
  },
  {
    href: '/pos/orders',
    label: 'Журнал',
    desc: 'История заказов',
    icon: ReceiptIcon,
    color: 'bg-cyan-100 text-cyan-700',
  },
  {
    href: '/pos/inventory',
    label: 'Склад',
    desc: 'Движения и аудит',
    icon: Layers,
    color: 'bg-lime-100 text-lime-700',
  },
  {
    href: '/pos/reports',
    label: 'Отчёты',
    desc: 'Аналитика продаж',
    icon: BarChart3,
    color: 'bg-sky-100 text-sky-700',
  },
  {
    href: '/pos/gift-cards',
    label: 'Подарочные',
    desc: 'Выпуск и баланс',
    icon: Gift,
    color: 'bg-yellow-100 text-yellow-700',
  },
  {
    href: '/pos/timeclock',
    label: 'Тайм-трекер',
    desc: 'Рабочее время',
    icon: Timer,
    color: 'bg-stone-100 text-stone-700',
  },
  {
    href: '/pos/customer-display',
    label: 'Экран клиента',
    desc: 'Второй экран / витрина',
    icon: Monitor,
    color: 'bg-zinc-100 text-zinc-700',
  },
  {
    href: '/pos/categories',
    label: 'Категории',
    desc: 'Группы товаров',
    icon: FolderTree,
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    href: '/pos/employees',
    label: 'Сотрудники',
    desc: 'Роли и доступы',
    icon: UserCircle,
    color: 'bg-purple-100 text-purple-700',
  },
  {
    href: '/pos/branches',
    label: 'Филиалы',
    desc: 'Мульти-локация',
    icon: Store,
    color: 'bg-red-100 text-red-700',
  },
  {
    href: '/pos/settings',
    label: 'Настройки',
    desc: 'Параметры POS',
    icon: Cog,
    color: 'bg-slate-100 text-slate-700',
  },
]

export function POSDashboardPage() {
  const [today, setToday] = useState<SalesReport | null>(null)
  const [week, setWeek] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      weekStart.setHours(0, 0, 0, 0)

      const [todayRes, weekRes] = await Promise.all([
        fetch(`/api/pos/reports/sales?from=${todayStart.toISOString()}`, {
          credentials: 'include',
        }),
        fetch(`/api/pos/reports/sales?from=${weekStart.toISOString()}`, {
          credentials: 'include',
        }),
      ])
      if (!todayRes.ok || !weekRes.ok) throw new Error('Network')
      setToday(await todayRes.json())
      setWeek(await weekRes.json())
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
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 60000)
    return () => window.clearInterval(t)
  }, [load])

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="POS · Дашборд"
        icon={<TrendingUp className="h-4 w-4 text-amber-500" />}
        backHref="/pos/dashboard"
        badge="Сегодня"
        actions={
          <Button size="icon" variant="ghost" onClick={() => load()}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        }
      />

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
        <LiveStrip />
        {/* KPI grid */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            icon={<CircleDollarSign className="h-4 w-4" />}
            label="Выручка сегодня"
            value={
              loading
                ? '—'
                : formatCurrency(today?.totals.gross ?? 0, 'UZS')
            }
            tone="primary"
          />
          <Kpi
            icon={<ShoppingCart className="h-4 w-4" />}
            label="Заказов"
            value={loading ? '—' : String(today?.totals.count ?? 0)}
          />
          <Kpi
            icon={<TrendingUp className="h-4 w-4" />}
            label="Средний чек"
            value={
              loading
                ? '—'
                : formatCurrency(today?.averageTicket ?? 0, 'UZS')
            }
          />
          <Kpi
            icon={<CreditCard className="h-4 w-4" />}
            label="Картой / Налом"
            value={
              loading
                ? '—'
                : `${formatCurrency(today?.totals.card ?? 0, 'UZS')} / ${formatCurrency(today?.totals.cash ?? 0, 'UZS')}`
            }
            small
          />
        </section>

        {/* Trend + Top products */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Тренд за 7 дней</CardTitle>
              <CardDescription>
                Дневная выручка
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Sparkline series={week?.series ?? []} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Топ-товары (7д)</CardTitle>
              <CardDescription>
                По выручке
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(week?.topProducts.length ?? 0) === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Пока нет данных
                </p>
              ) : (
                <ul className="space-y-2">
                  {week!.topProducts.map((p, i) => (
                    <li
                      key={p.productId ?? i}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-secondary/30 px-2.5 py-1.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
                          {i + 1}
                        </span>
                        <span className="truncate text-sm font-medium">
                          {p.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold tabular-nums">
                          {formatCurrency(p.revenue, 'UZS')}
                        </div>
                        <div className="text-[10px] tabular-nums text-muted-foreground">
                          {p.qty} шт.
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick links */}
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-tight">
            Быстрый доступ
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {QUICK_LINKS.map((q) => {
              const Icon = q.icon
              return (
                <Link
                  key={q.href}
                  href={q.href}
                  className="group rounded-xl border border-border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div
                    className={cn(
                      'mb-2 grid h-9 w-9 place-items-center rounded-lg',
                      q.color
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-semibold">{q.label}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {q.desc}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

// Local Kpi adapter — maps the page's 'primary' tone to KpiTile's 'amber'.
// Keeps the call sites unchanged while the visual contract lives in
// the shared @/components/pos/shared/KpiTile.
function Kpi({
  icon,
  label,
  value,
  tone,
  small,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: 'primary'
  small?: boolean
}) {
  return (
    <KpiTile
      icon={icon}
      label={label}
      value={value}
      tone={tone === 'primary' ? 'amber' : 'neutral'}
      className={small ? 'text-sm' : undefined}
    />
  )
}

function Sparkline({
  series,
}: {
  series: Array<{ date: string; revenue: number; orders: number }>
}) {
  const data = useMemo(() => {
    // Pad to last 7 days even if some are missing.
    const map = new Map(series.map((s) => [s.date, s]))
    const out: Array<{ date: string; revenue: number; orders: number }> = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      out.push(
        map.get(key) ?? { date: key, revenue: 0, orders: 0 }
      )
    }
    return out
  }, [series])
  const max = Math.max(1, ...data.map((d) => d.revenue))
  const W = 600
  const H = 160
  const PAD = 16
  const innerW = W - 2 * PAD
  const innerH = H - 2 * PAD
  const stepX = innerW / Math.max(1, data.length - 1)
  const points = data
    .map((d, i) => {
      const x = PAD + i * stepX
      const y = PAD + innerH - (d.revenue / max) * innerH
      return `${x},${y}`
    })
    .join(' ')
  const areaPoints = `${PAD},${H - PAD} ${points} ${PAD + innerW},${H - PAD}`

  return (
    <div className="relative w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full">
        <defs>
          <linearGradient id="spark-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.32" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#spark-grad)" />
        <polyline
          points={points}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => {
          const x = PAD + i * stepX
          const y = PAD + innerH - (d.revenue / max) * innerH
          return (
            <g key={d.date}>
              <circle cx={x} cy={y} r={3} fill="hsl(var(--primary))" />
              <text
                x={x}
                y={H - 2}
                textAnchor="middle"
                className="fill-current text-[10px] text-muted-foreground"
              >
                {d.date.slice(5)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
