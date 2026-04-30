'use client'
/**
 * Employees roster + admin management — new UI counterpart of the legacy
 * AdminsTab. Reuses /api/admin/low-admins (POST/PATCH/DELETE) and
 * /api/admin/{id}/toggle-status to manage LOW_ADMIN, COURIER, WORKER
 * accounts directly from /pos/employees, without redirecting to the
 * old /middle-admin?tab=admins page.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  Phone,
  Plus,
  Pencil,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  User,
  UserCog,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { formatCurrency } from '@/lib/pos'

type Role = 'SUPER_ADMIN' | 'MIDDLE_ADMIN' | 'LOW_ADMIN' | 'COURIER' | 'WORKER'

type Employee = {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
  salary: number
  phone?: string | null
  isOnShift: boolean
  shiftStartedAt?: string | null
  averageDeliveryMinutes?: number | null
  allowedTabs?: string[] | null
}

const ROLE_META: Record<
  Role,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  SUPER_ADMIN: { label: 'Супер-админ', icon: ShieldCheck, tone: 'bg-rose-100 text-rose-700' },
  MIDDLE_ADMIN: { label: 'Управляющий', icon: UserCog, tone: 'bg-amber-100 text-amber-700' },
  LOW_ADMIN: { label: 'Кассир', icon: User, tone: 'bg-blue-100 text-blue-700' },
  WORKER: { label: 'Сотрудник', icon: User, tone: 'bg-slate-100 text-slate-700' },
  COURIER: { label: 'Курьер', icon: Truck, tone: 'bg-emerald-100 text-emerald-700' },
}

const TAB_OPTIONS = [
  { id: 'orders', label: 'Заказы' },
  { id: 'clients', label: 'Клиенты' },
  { id: 'statistics', label: 'Статистика' },
  { id: 'warehouse', label: 'Склад' },
  { id: 'finance', label: 'Финансы' },
  { id: 'history', label: 'История' },
  { id: 'admins', label: 'Админы' },
  { id: 'interface', label: 'Интерфейс' },
  { id: 'bin', label: 'Корзина' },
]

type FormState = {
  id?: string
  email: string
  name: string
  phone: string
  role: 'LOW_ADMIN' | 'COURIER' | 'WORKER'
  password: string
  salary: number
  isActive: boolean
  allowedTabs: string[]
}

const EMPTY_FORM: FormState = {
  email: '',
  name: '',
  phone: '',
  role: 'LOW_ADMIN',
  password: '',
  salary: 0,
  isActive: true,
  allowedTabs: ['orders', 'clients'],
}

export function EmployeesPage() {
  const [items, setItems] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'on-shift' | 'blocked'>('all')
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pos/employees', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: Employee[] }
      setItems(data.items ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить')
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
      if (filter === 'blocked' && e.isActive) return false
      if (filter === 'on-shift' && !e.isOnShift) return false
      if (roleFilter !== 'all' && e.role !== roleFilter) return false
      if (!q) return true
      return (
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.phone ?? '').toLowerCase().includes(q)
      )
    })
  }, [items, filter, roleFilter, query])

  const stats = useMemo(() => {
    const total = items.length
    const active = items.filter((e) => e.isActive).length
    const onShift = items.filter((e) => e.isOnShift).length
    const blocked = items.filter((e) => !e.isActive).length
    return { total, active, onShift, blocked }
  }, [items])

  const openCreate = () => {
    setFormMode('create')
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (e: Employee) => {
    if (e.role === 'SUPER_ADMIN' || e.role === 'MIDDLE_ADMIN') {
      toast.error('Роль управляется только из /middle-admin')
      return
    }
    setFormMode('edit')
    setForm({
      id: e.id,
      email: e.email,
      name: e.name,
      phone: e.phone ?? '',
      role: e.role as FormState['role'],
      password: '',
      salary: e.salary,
      isActive: e.isActive,
      allowedTabs: e.allowedTabs ?? ['orders', 'clients'],
    })
    setFormOpen(true)
  }

  const submitForm = async () => {
    if (!form.email || !form.name) {
      toast.error('Email и имя обязательны')
      return
    }
    if (formMode === 'create' && form.role !== 'WORKER' && !form.password) {
      toast.error('Пароль обязателен')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        email: form.email,
        name: form.name,
        role: form.role,
        salary: form.salary,
        allowedTabs: form.role === 'LOW_ADMIN' ? form.allowedTabs : [],
        ...(form.password ? { password: form.password } : {}),
        ...(formMode === 'edit' ? { isActive: form.isActive } : {}),
      }
      const res = await fetch(
        formMode === 'create' ? '/api/admin/low-admins' : `/api/admin/low-admins/${form.id}`,
        {
          method: formMode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success(formMode === 'create' ? 'Сотрудник создан' : 'Сохранено')
      setFormOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (e: Employee) => {
    if (e.role === 'SUPER_ADMIN' || e.role === 'MIDDLE_ADMIN') {
      toast.error('Эта роль управляется только из /middle-admin')
      return
    }
    setPendingId(e.id)
    try {
      const res = await fetch(`/api/admin/${e.id}/toggle-status`, {
        method: 'PATCH',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success(e.isActive ? 'Заблокирован' : 'Разблокирован')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setPendingId(null)
    }
  }

  const remove = async (e: Employee) => {
    if (!confirm(`Удалить аккаунт «${e.name}»?`)) return
    setPendingId(e.id)
    try {
      const res = await fetch(`/api/admin/low-admins/${e.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Удалено')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setPendingId(null)
    }
  }

  const toggleTab = (tab: string) => {
    setForm((prev) => ({
      ...prev,
      allowedTabs: prev.allowedTabs.includes(tab)
        ? prev.allowedTabs.filter((t) => t !== tab)
        : [...prev.allowedTabs, tab],
    }))
  }

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
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Добавить
          </Button>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
            Обновить
          </Button>
        </div>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-2 border-b border-border bg-card p-3 sm:grid-cols-4">
        <KPI label="Всего" value={String(stats.total)} tone="neutral" />
        <KPI label="Активные" value={String(stats.active)} tone="emerald" />
        <KPI label="На смене" value={String(stats.onShift)} tone="amber" />
        <KPI label="Заблокированы" value={String(stats.blocked)} tone="rose" />
      </div>

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
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все роли</SelectItem>
            <SelectItem value="LOW_ADMIN">Кассиры</SelectItem>
            <SelectItem value="COURIER">Курьеры</SelectItem>
            <SelectItem value="WORKER">Сотрудники</SelectItem>
            <SelectItem value="MIDDLE_ADMIN">Управляющие</SelectItem>
          </SelectContent>
        </Select>
        {(['all', 'active', 'on-shift', 'blocked'] as const).map((f) => (
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
                : f === 'on-shift'
                  ? 'На смене'
                  : 'Заблокированы'}
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
              const canManage = e.role !== 'SUPER_ADMIN' && e.role !== 'MIDDLE_ADMIN'
              const busy = pendingId === e.id
              return (
                <article
                  key={e.id}
                  className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <header className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn('grid h-9 w-9 place-items-center rounded-md', meta.tone)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-tight truncate">{e.name}</div>
                        <div className="text-[11px] text-muted-foreground">{meta.label}</div>
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
                      {e.isOnShift ? '● На смене' : e.isActive ? 'Свободен' : 'Заблокирован'}
                    </Badge>
                  </header>

                  <dl className="mt-3 flex-1 space-y-1 text-xs">
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
                          <a href={`tel:${e.phone}`} className="hover:underline">
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
                    {e.role === 'COURIER' && typeof e.averageDeliveryMinutes === 'number' && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <dt>Средняя доставка</dt>
                        <dd className="text-foreground tabular-nums">
                          {Math.round(e.averageDeliveryMinutes)} мин
                        </dd>
                      </div>
                    )}
                  </dl>

                  {canManage && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => openEdit(e)}
                        disabled={busy}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Изменить
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => toggleActive(e)}
                        disabled={busy}
                      >
                        {e.isActive ? (
                          <>
                            <PowerOff className="mr-1 h-3 w-3" />
                            Блок
                          </>
                        ) : (
                          <>
                            <Power className="mr-1 h-3 w-3" />
                            Разблок
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => remove(e)}
                        disabled={busy}
                      >
                        {busy ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}

        <Card className="mt-4 border-dashed">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              Полный функционал управления доступен в старой панели:{' '}
              <a
                href="/middle-admin?tab=admins"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                /middle-admin?tab=admins
              </a>{' '}
              — массовые операции, расширенные настройки allowedTabs и история действий.
              Здесь — быстрое управление повседневными аккаунтами без переключения экранов.
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Добавить сотрудника' : 'Изменить сотрудника'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Имя</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Телефон</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+998…"
                />
              </div>
              <div>
                <Label className="text-xs">Роль</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as FormState['role'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW_ADMIN">Кассир</SelectItem>
                    <SelectItem value="COURIER">Курьер</SelectItem>
                    <SelectItem value="WORKER">Сотрудник</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">
                  Пароль{formMode === 'edit' ? ' (оставить пустым = без изменения)' : ''}
                </Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={formMode === 'edit' ? '••••••' : 'Минимум 6 символов'}
                />
              </div>
              <div>
                <Label className="text-xs">Зарплата (UZS / день)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.salary}
                  onChange={(e) =>
                    setForm({ ...form, salary: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            {form.role === 'LOW_ADMIN' && (
              <div>
                <Label className="text-xs">Доступ к разделам</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {TAB_OPTIONS.map((t) => {
                    const active = form.allowedTabs.includes(t.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTab(t.id)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                          active
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                            : 'border-border bg-card text-muted-foreground hover:bg-accent'
                        )}
                      >
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {formMode === 'edit' && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2 text-sm">
                <Label htmlFor="emp-active" className="flex-1 text-xs">
                  Активный аккаунт
                </Label>
                <input
                  id="emp-active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submitForm} disabled={submitting}>
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {formMode === 'create' ? 'Создать' : 'Сохранить'}
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
  tone,
}: {
  label: string
  value: string
  tone: 'emerald' | 'rose' | 'amber' | 'neutral'
}) {
  const cls = {
    emerald: 'border-emerald-200 bg-emerald-50/60 text-emerald-900',
    rose: 'border-rose-200 bg-rose-50/60 text-rose-900',
    amber: 'border-amber-200 bg-amber-50/60 text-amber-900',
    neutral: 'border-border bg-card text-foreground',
  }[tone]
  return (
    <div className={cn('rounded-lg border p-2 shadow-sm', cls)}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-base font-bold tabular-nums">{value}</div>
    </div>
  )
}
