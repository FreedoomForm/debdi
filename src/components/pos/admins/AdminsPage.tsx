'use client'
/**
 * /pos/admins — modern admin / staff roster built on top of
 * /api/admin/low-admins and /api/admin/middle-admins.
 *
 * The legacy /middle-admin?tab=admins view is preserved untouched —
 * no redirects. This is the *new UI* counterpart with KPI strip,
 * search, role filter, status pill, and a quick "New admin" dialog.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ShieldCheck,
  Search,
  Loader2,
  RefreshCw,
  UserPlus,
  Filter,
  Download,
  Phone,
  CircleDot,
  Users,
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
import { cn } from '@/lib/utils'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'

type Role = 'SUPER_ADMIN' | 'MIDDLE_ADMIN' | 'LOW_ADMIN' | 'COURIER' | 'WORKER'

type AdminUser = {
  id: string
  name: string
  email?: string
  phone?: string
  role: Role
  isActive?: boolean
  createdAt?: string
  creator?: { name?: string } | null
}

const ROLE_META: Record<Role, { label: string; tone: string }> = {
  SUPER_ADMIN: { label: 'Super', tone: 'bg-violet-100 text-violet-800' },
  MIDDLE_ADMIN: { label: 'Middle', tone: 'bg-indigo-100 text-indigo-800' },
  LOW_ADMIN: { label: 'Admin', tone: 'bg-cyan-100 text-cyan-800' },
  COURIER: { label: 'Курьер', tone: 'bg-amber-100 text-amber-800' },
  WORKER: { label: 'Сотрудник', tone: 'bg-slate-100 text-slate-700' },
}

export default function AdminsPage() {
  const [people, setPeople] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all')

  // New admin dialog
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<Role>('LOW_ADMIN')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Try middle-admins endpoint (super admin only); ignore 403
      const [lowRes, midRes] = await Promise.all([
        fetch('/api/admin/low-admins', { cache: 'no-store', credentials: 'include' }),
        fetch('/api/admin/middle-admins', { cache: 'no-store', credentials: 'include' }),
      ])
      const list: AdminUser[] = []
      if (lowRes.ok) {
        const data = await lowRes.json()
        const arr = Array.isArray(data) ? data : data?.admins ?? []
        list.push(...arr)
      }
      if (midRes.ok) {
        const data = await midRes.json()
        const arr = Array.isArray(data) ? data : data?.admins ?? []
        list.push(...arr)
      }
      // De-dupe by id (in case both endpoints return the same person)
      const seen = new Set<string>()
      const merged = list.filter((p) => {
        if (seen.has(p.id)) return false
        seen.add(p.id)
        return true
      })
      setPeople(merged)
    } catch (err) {
      console.error('admins load failed', err)
      toast.error('Не удалось загрузить персонал')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const byRole: Record<string, number> = {}
    let active = 0
    for (const p of people) {
      byRole[p.role] = (byRole[p.role] ?? 0) + 1
      if (p.isActive !== false) active += 1
    }
    return {
      total: people.length,
      active,
      inactive: people.length - active,
      byRole,
    }
  }, [people])

  const filtered = useMemo(() => {
    let list = people
    if (roleFilter !== 'all') list = list.filter((p) => p.role === roleFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((p) =>
        `${p.name} ${p.email ?? ''} ${p.phone ?? ''}`.toLowerCase().includes(q)
      )
    }
    return list
  }, [people, roleFilter, search])

  const submitNew = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error('Имя, email и пароль обязательны')
      return
    }
    setSubmitting(true)
    try {
      const endpoint =
        newRole === 'MIDDLE_ADMIN' ? '/api/admin/middle-admins' : '/api/admin/low-admins'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
        }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error ?? 'Не удалось создать пользователя')
      }
      toast.success('Пользователь создан')
      setAddOpen(false)
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      setNewRole('LOW_ADMIN')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  const exportCsv = () => {
    const rows = [
      ['Имя', 'Email', 'Телефон', 'Роль', 'Активен', 'Создан', 'Кем создан'],
      ...filtered.map((p) => [
        p.name,
        p.email ?? '',
        p.phone ?? '',
        ROLE_META[p.role]?.label ?? p.role,
        p.isActive === false ? 'нет' : 'да',
        p.createdAt ? new Date(p.createdAt).toLocaleDateString('ru-RU') : '',
        p.creator?.name ?? '',
      ]),
    ]
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admins-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Персонал"
        backHref="/pos/dashboard"
        icon={<ShieldCheck className="h-4 w-4 text-violet-600" />}
        actions={
          <>
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
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="mr-1 h-4 w-4" />
              Новый
            </Button>
          </>
        }
      />

      <main className="space-y-4 p-4 lg:p-6">

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile
          label="Всего"
          value={stats.total}
          icon={<Users className="h-4 w-4" />}
          tone="neutral"
          hint={`${stats.active} активных`}
        />
        <KpiTile
          label="Middle"
          value={stats.byRole.MIDDLE_ADMIN ?? 0}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="indigo"
          hint="Главные админы"
        />
        <KpiTile
          label="Low"
          value={stats.byRole.LOW_ADMIN ?? 0}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="emerald"
          hint="Линейные админы"
        />
        <KpiTile
          label="Курьеры"
          value={stats.byRole.COURIER ?? 0}
          icon={<Users className="h-4 w-4" />}
          tone="amber"
          hint="Доставка"
        />
        <KpiTile
          label="Сотрудники"
          value={stats.byRole.WORKER ?? 0}
          icon={<Users className="h-4 w-4" />}
          tone="neutral"
          hint="Кухня, склад"
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
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-1 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все роли</SelectItem>
            <SelectItem value="MIDDLE_ADMIN">Middle Admin</SelectItem>
            <SelectItem value="LOW_ADMIN">Low Admin</SelectItem>
            <SelectItem value="COURIER">Курьеры</SelectItem>
            <SelectItem value="WORKER">Сотрудники</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Контакт</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Создан</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    {loading ? 'Загрузка…' : 'Никого не найдено'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      {p.creator?.name && (
                        <div className="text-[11px] text-muted-foreground">
                          создан: {p.creator.name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{p.email ?? '—'}</div>
                      {p.phone && (
                        <a
                          href={`tel:${p.phone}`}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <Phone className="h-3 w-3" />
                          {p.phone}
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(ROLE_META[p.role]?.tone)}>
                        {ROLE_META[p.role]?.label ?? p.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('ru-RU') : '—'}
                    </TableCell>
                    <TableCell>
                      {p.isActive === false ? (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                          Заблокирован
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                          <CircleDot className="mr-1 h-3 w-3" /> Активен
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый пользователь</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Имя</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Имя Фамилия" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label className="text-xs">Пароль</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
              />
            </div>
            <div>
              <Label className="text-xs">Роль</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MIDDLE_ADMIN">Middle Admin</SelectItem>
                  <SelectItem value="LOW_ADMIN">Low Admin</SelectItem>
                  <SelectItem value="COURIER">Курьер</SelectItem>
                  <SelectItem value="WORKER">Сотрудник</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submitNew} disabled={submitting}>
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              <UserPlus className="mr-1 h-4 w-4" />
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </main>
    </div>
  )
}

// KPI tile is now provided by @/components/pos/shared/KpiTile
