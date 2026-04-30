'use client'
/**
 * /pos/history — modern action log / audit page.
 *
 * New UI counterpart of the legacy HistoryTable on /middle-admin?tab=history.
 * Reuses /api/admin/action-logs and /api/admin/users-list endpoints.
 * Old UI preserved untouched.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Filter,
  History as HistoryIcon,
  Loader2,
  RefreshCw,
  Search,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'

type ActionLog = {
  id: string
  action: string
  entityType?: string | null
  entityId?: string | null
  adminId?: string | null
  adminName?: string | null
  details?: string | null
  ipAddress?: string | null
  createdAt: string
}

type UserOption = {
  id: string
  name: string
  email?: string
  role?: string
}

const ACTION_TONE: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-rose-100 text-rose-800',
  RESTORE: 'bg-cyan-100 text-cyan-800',
  LOGIN: 'bg-violet-100 text-violet-800',
  LOGOUT: 'bg-slate-100 text-slate-700',
  PAYMENT: 'bg-amber-100 text-amber-800',
  REFUND: 'bg-rose-100 text-rose-800',
}

function pickTone(action: string): string {
  const upper = action.toUpperCase()
  for (const [k, v] of Object.entries(ACTION_TONE)) {
    if (upper.includes(k)) return v
  }
  return 'bg-slate-100 text-slate-700'
}

const PAGE_SIZE = 50

export default function HistoryPage() {
  const [logs, setLogs] = useState<ActionLog[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(0)
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users-list', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = await res.json()
      setUsers(Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [])
    } catch {
      /* silent */
    }
  }, [])

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      })
      if (selectedUser !== 'all') params.append('adminId', selectedUser)
      if (dateFrom) params.append('from', dateFrom)
      if (dateTo) params.append('to', dateTo)
      const res = await fetch(`/api/admin/action-logs?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setLogs(Array.isArray(data?.logs) ? data.logs : [])
      setTotal(typeof data?.total === 'number' ? data.total : 0)
      setHasMore(Boolean(data?.hasMore))
    } catch (err) {
      toast.error(err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить')
    } finally {
      setLoading(false)
    }
  }, [page, selectedUser, dateFrom, dateTo])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const filtered = useMemo(() => {
    if (!search) return logs
    const q = search.toLowerCase()
    return logs.filter((l) => {
      const hay = `${l.action} ${l.entityType ?? ''} ${l.entityId ?? ''} ${l.adminName ?? ''} ${l.details ?? ''}`
      return hay.toLowerCase().includes(q)
    })
  }, [logs, search])

  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayCount = logs.filter((l) => new Date(l.createdAt) >= today).length
    const uniqueAdmins = new Set(logs.map((l) => l.adminId).filter(Boolean)).size
    const actionTypes = new Set(logs.map((l) => l.action.toUpperCase().split('_')[0])).size
    return { todayCount, uniqueAdmins, actionTypes }
  }, [logs])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="min-h-screen bg-background">
      <PosPageHeader
        title="Журнал действий"
        icon={<HistoryIcon className="h-4 w-4 text-amber-500" />}
        badge={total}
        actions={
          <Button size="sm" variant="outline" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
            Обновить
          </Button>
        }
      />

      <main className="mx-auto max-w-[1400px] space-y-3 p-3 lg:p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <KpiTile label="Всего записей" value={total} tone="neutral" />
          <KpiTile
            label="Сегодня"
            value={stats.todayCount}
            tone={stats.todayCount > 0 ? 'emerald' : 'neutral'}
          />
          <KpiTile
            label="Админов активно"
            value={stats.uniqueAdmins}
            tone={stats.uniqueAdmins > 0 ? 'amber' : 'neutral'}
          />
          <KpiTile label="Типов действий" value={stats.actionTypes} tone="neutral" />
        </div>

        <Card>
          <CardContent className="grid gap-2 p-3 lg:grid-cols-[1fr_220px_auto_auto]">
            <div className="relative">
              <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по действию, объекту, админу…"
                className="pl-8"
              />
            </div>
            <Select
              value={selectedUser}
              onValueChange={(v) => {
                setSelectedUser(v)
                setPage(0)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все админы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все админы</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                    {u.role ? ` · ${u.role}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(0)
              }}
              className="w-[160px]"
              title="С даты"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(0)
              }}
              className="w-[160px]"
              title="По дату"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="grid place-items-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Нет записей для выбранных фильтров
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Время</TableHead>
                    <TableHead>Админ</TableHead>
                    <TableHead>Действие</TableHead>
                    <TableHead>Объект</TableHead>
                    <TableHead>Детали</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                        {new Date(l.createdAt).toLocaleString('ru-RU')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{l.adminName ?? '—'}</span>
                        </div>
                        {l.ipAddress && (
                          <div className="text-[10px] text-muted-foreground tabular-nums">
                            {l.ipAddress}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-[10px]', pickTone(l.action))}>
                          {l.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {l.entityType ? (
                          <>
                            <div className="font-medium">{l.entityType}</div>
                            {l.entityId && (
                              <div className="text-[10px] text-muted-foreground">
                                {l.entityId.slice(0, 12)}…
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[400px] truncate text-xs text-muted-foreground">
                        {l.details ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Страница {page + 1} из {totalPages} · {filtered.length} из {total}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}


