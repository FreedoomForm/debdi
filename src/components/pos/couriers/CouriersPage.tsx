'use client'
/**
 * /pos/couriers — modern delivery / couriers dashboard built on top of
 * /api/admin/couriers and /api/admin/live-map.
 *
 * The legacy /middle-admin?tab=admins&role=COURIER and live-map views are
 * preserved untouched and remain accessible. This is the *new UI* counterpart
 * with KPI strip, search, segment filters, salary editing, and live position
 * polling.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Truck,
  Search,
  Loader2,
  RefreshCw,
  MapPin,
  Phone,
  Wallet,
  CircleDot,
  Filter,
  Download,
  Pencil,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/pos'
import { usePolling } from '@/hooks/usePolling'
import { cn } from '@/lib/utils'

type Courier = {
  id: string
  name: string
  email?: string
  phone?: string
  isActive?: boolean
  latitude?: number | null
  longitude?: number | null
  salary?: number | null
  ordersToday?: number
  ordersTotal?: number
  lastSeenAt?: string | null
}

type LiveCourier = {
  id: string
  name?: string
  latitude?: number | null
  longitude?: number | null
  updatedAt?: string
}

export default function CouriersPage() {
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState<'all' | 'active' | 'inactive' | 'online' | 'offline'>('all')

  const [editing, setEditing] = useState<Courier | null>(null)
  const [editName, setEditName] = useState('')
  const [editSalary, setEditSalary] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Live polling for current courier positions (every 20s)
  const { data: liveData } = usePolling<{ couriers?: LiveCourier[] } | LiveCourier[]>(
    '/api/admin/live-map',
    20000
  )
  const liveCouriers = useMemo(() => {
    if (!liveData) return new Map<string, LiveCourier>()
    const arr = Array.isArray(liveData) ? liveData : liveData.couriers ?? []
    return new Map(arr.map((c) => [c.id, c]))
  }, [liveData])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/couriers', { cache: 'no-store', credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : data?.couriers ?? []
      setCouriers(list)
    } catch (err) {
      console.error('couriers load failed', err)
      toast.error('Не удалось загрузить курьеров')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const isOnline = (c: Courier) => {
    const live = liveCouriers.get(c.id)
    if (!live) return false
    if (!live.updatedAt) return Boolean(live.latitude && live.longitude)
    const seen = new Date(live.updatedAt).getTime()
    return Date.now() - seen < 5 * 60 * 1000 // last 5 min
  }

  const stats = useMemo(() => {
    const active = couriers.filter((c) => c.isActive !== false).length
    const online = couriers.filter(isOnline).length
    const totalSalary = couriers.reduce((s, c) => s + (c.salary ?? 0), 0)
    const ordersToday = couriers.reduce((s, c) => s + (c.ordersToday ?? 0), 0)
    return {
      total: couriers.length,
      active,
      inactive: couriers.length - active,
      online,
      offline: active - online,
      totalSalary,
      ordersToday,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couriers, liveCouriers])

  const filtered = useMemo(() => {
    let list = couriers
    if (segment === 'active') list = list.filter((c) => c.isActive !== false)
    else if (segment === 'inactive') list = list.filter((c) => c.isActive === false)
    else if (segment === 'online') list = list.filter(isOnline)
    else if (segment === 'offline') list = list.filter((c) => c.isActive !== false && !isOnline(c))

    if (search) {
      const q = search.toLowerCase()
      list = list.filter((c) =>
        `${c.name} ${c.email ?? ''} ${c.phone ?? ''}`.toLowerCase().includes(q)
      )
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couriers, segment, search, liveCouriers])

  const startEdit = (c: Courier) => {
    setEditing(c)
    setEditName(c.name)
    setEditSalary(String(c.salary ?? 0))
  }

  const submitEdit = async () => {
    if (!editing) return
    if (!editName.trim()) {
      toast.error('Имя обязательно')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/couriers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          courierId: editing.id,
          name: editName.trim(),
          salary: Number(editSalary) || 0,
        }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error ?? 'Не удалось сохранить')
      }
      toast.success('Курьер обновлён')
      setEditing(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  const exportCsv = () => {
    const rows = [
      ['Имя', 'Email', 'Телефон', 'Активен', 'Онлайн', 'Зарплата', 'Сегодня заказов', 'Всего заказов'],
      ...filtered.map((c) => [
        c.name,
        c.email ?? '',
        c.phone ?? '',
        c.isActive === false ? 'нет' : 'да',
        isOnline(c) ? 'да' : 'нет',
        String(c.salary ?? 0),
        String(c.ordersToday ?? 0),
        String(c.ordersTotal ?? 0),
      ]),
    ]
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `couriers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Truck className="h-6 w-6 text-indigo-600" />
            Курьеры
          </h1>
          <p className="text-sm text-muted-foreground">
            Доставка, лайв-карта, заказы и зарплата курьеров
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-4 w-4" />
            )}
            Обновить
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" />
            CSV
          </Button>
          <Button size="sm" asChild variant="outline">
            <a href="/middle-admin?tab=orders&sub=map" target="_blank" rel="noreferrer">
              <MapPin className="mr-1 h-4 w-4" />
              Лайв-карта
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI
          label="Всего"
          value={String(stats.total)}
          icon={<Truck className="h-4 w-4" />}
          tone="neutral"
          hint={`${stats.active} активных`}
        />
        <KPI
          label="Онлайн сейчас"
          value={String(stats.online)}
          icon={<CircleDot className="h-4 w-4" />}
          tone={stats.online > 0 ? 'emerald' : 'neutral'}
          hint={`${stats.offline} оффлайн`}
        />
        <KPI
          label="Сегодня заказов"
          value={String(stats.ordersToday)}
          icon={<Truck className="h-4 w-4" />}
          tone="emerald"
          hint="по всем курьерам"
        />
        <KPI
          label="Фонд зарплаты"
          value={formatCurrency(stats.totalSalary, 'UZS')}
          icon={<Wallet className="h-4 w-4" />}
          tone="amber"
          hint="суммарно в день"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, email, телефону…"
            className="pl-8"
          />
        </div>
        <Select value={segment} onValueChange={(v) => setSegment(v as typeof segment)}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-1 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все курьеры</SelectItem>
            <SelectItem value="active">Только активные</SelectItem>
            <SelectItem value="inactive">Неактивные</SelectItem>
            <SelectItem value="online">Онлайн (5 мин)</SelectItem>
            <SelectItem value="offline">Активные офлайн</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Курьер</TableHead>
                <TableHead>Контакт</TableHead>
                <TableHead>Локация</TableHead>
                <TableHead className="text-right">Сегодня</TableHead>
                <TableHead className="text-right">Всего</TableHead>
                <TableHead className="text-right">Зарплата/день</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {loading ? 'Загрузка…' : 'Курьеры не найдены'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => {
                  const live = liveCouriers.get(c.id)
                  const online = isOnline(c)
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                        {c.email && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1">{c.email}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.phone ? (
                          <a
                            href={`tel:${c.phone}`}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {live?.latitude && live?.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${live.latitude},${live.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <MapPin className="h-3 w-3" />
                            {live.latitude.toFixed(4)}, {live.longitude.toFixed(4)}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">нет позиции</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.ordersToday ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {c.ordersTotal ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(c.salary ?? 0, 'UZS')}
                      </TableCell>
                      <TableCell>
                        {c.isActive === false ? (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                            Неактивен
                          </Badge>
                        ) : online ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                            <CircleDot className="mr-1 h-3 w-3" /> Онлайн
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            Офлайн
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <Truck className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Расширенные действия (создание курьера, смена пароля, диспетчеризация заказов,
            оптимизация маршрутов через ORS) доступны в{' '}
            <a
              href="/middle-admin?tab=admins&role=COURIER"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              старой вкладке управления курьерами
            </a>{' '}
            и на{' '}
            <a
              href="/middle-admin?tab=orders&sub=map"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              лайв-карте
            </a>
            .
          </div>
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать курьера</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Имя</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Зарплата за день, UZS</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={editSalary}
                onChange={(e) => setEditSalary(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Отмена
            </Button>
            <Button onClick={submitEdit} disabled={submitting}>
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function KPI({
  label,
  value,
  icon,
  hint,
  tone,
}: {
  label: string
  value: string
  icon: React.ReactNode
  hint: string
  tone: 'emerald' | 'rose' | 'amber' | 'neutral'
}) {
  const toneClass = {
    emerald: 'border-emerald-200 bg-emerald-50/60',
    rose: 'border-rose-200 bg-rose-50/60',
    amber: 'border-amber-200 bg-amber-50/60',
    neutral: 'border-border bg-card',
  }[tone]
  const valueClass = {
    emerald: 'text-emerald-900',
    rose: 'text-rose-900',
    amber: 'text-amber-900',
    neutral: 'text-foreground',
  }[tone]
  return (
    <div className={cn('rounded-xl border p-3 shadow-sm', toneClass)}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn('mt-1 text-lg font-bold tabular-nums', valueClass)}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  )
}
