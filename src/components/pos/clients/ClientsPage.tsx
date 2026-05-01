'use client'
/**
 * /pos/clients — modern CRM dashboard built on top of /api/admin/clients.
 *
 * The legacy /middle-admin?tab=clients view is preserved untouched and
 * remains accessible. This is the *new UI* counterpart with KPI strip,
 * search, segment filters, balance sorting, and a quick-add dialog.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Users,
  Phone,
  Search,
  Loader2,
  UserPlus,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Filter,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { RefreshButton } from '@/components/pos/shared/RefreshButton'
import { EntityStatusBadge } from '@/components/admin/dashboard/shared/EntityStatusBadge'
import { FilterToolbar } from '@/components/admin/dashboard/shared/FilterToolbar'

type Client = {
  id: string
  name: string
  phone: string
  address?: string
  balance?: number
  isActive?: boolean
  totalSpent?: number
  totalOrders?: number
  dailyPrice?: number
  planType?: string
  createdAt?: string
  defaultCourier?: { id: string; name: string } | null
  assignedSet?: { id: string; name: string } | null
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState<'all' | 'active' | 'inactive' | 'debt' | 'prepaid' | 'top'>('all')

  // New client modal
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/clients', { cache: 'no-store', credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : data?.clients ?? []
      setClients(list)
    } catch (err) {
      console.error('clients load failed', err)
      toast.error('Не удалось загрузить клиентов')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const active = clients.filter((c) => c.isActive !== false).length
    const debt = clients.filter((c) => (c.balance ?? 0) < 0)
    const prepaid = clients.filter((c) => (c.balance ?? 0) > 0)
    const debtTotal = debt.reduce((s, c) => s + Math.abs(c.balance ?? 0), 0)
    const prepaidTotal = prepaid.reduce((s, c) => s + (c.balance ?? 0), 0)
    const ltv = clients.reduce((s, c) => s + (c.totalSpent ?? 0), 0)
    return {
      total: clients.length,
      active,
      inactive: clients.length - active,
      debtCount: debt.length,
      prepaidCount: prepaid.length,
      debtTotal,
      prepaidTotal,
      ltv,
    }
  }, [clients])

  const filtered = useMemo(() => {
    let list = clients
    if (segment === 'active') list = list.filter((c) => c.isActive !== false)
    else if (segment === 'inactive') list = list.filter((c) => c.isActive === false)
    else if (segment === 'debt') list = list.filter((c) => (c.balance ?? 0) < 0)
    else if (segment === 'prepaid') list = list.filter((c) => (c.balance ?? 0) > 0)
    else if (segment === 'top')
      list = [...list].sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0)).slice(0, 50)

    if (search) {
      const q = search.toLowerCase()
      list = list.filter((c) =>
        `${c.name} ${c.phone} ${c.address ?? ''}`.toLowerCase().includes(q)
      )
    }
    return list
  }, [clients, segment, search])

  const submitNew = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast.error('Имя и телефон обязательны')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim(),
          address: newAddress.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error ?? 'Не удалось создать клиента')
      }
      toast.success('Клиент создан')
      setAddOpen(false)
      setNewName('')
      setNewPhone('')
      setNewAddress('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  const exportCsv = () => {
    const rows = [
      ['Имя', 'Телефон', 'Адрес', 'Активен', 'Баланс', 'Заказов', 'LTV'],
      ...filtered.map((c) => [
        c.name,
        c.phone,
        c.address ?? '',
        c.isActive === false ? 'нет' : 'да',
        String(c.balance ?? 0),
        String(c.totalOrders ?? 0),
        String(c.totalSpent ?? 0),
      ]),
    ]
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Клиенты"
        backHref="/pos/dashboard"
        icon={<Users className="h-4 w-4 text-cyan-600" />}
        actions={
          <>
            <RefreshButton onClick={load} loading={loading} />
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-1 h-4 w-4" />
              CSV
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="mr-1 h-4 w-4" />
              Новый клиент
            </Button>
          </>
        }
      />

      <main className="space-y-4 p-4 lg:p-6">

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Всего"
          value={stats.total}
          icon={<Users className="h-4 w-4" />}
          tone="neutral"
          hint={`${stats.active} активных`}
        />
        <KpiTile
          label="Долги"
          value={formatCurrency(stats.debtTotal, 'UZS')}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={stats.debtTotal > 0 ? 'rose' : 'neutral'}
          hint={`${stats.debtCount} клиентов в минусе`}
        />
        <KpiTile
          label="Предоплаты"
          value={formatCurrency(stats.prepaidTotal, 'UZS')}
          icon={<Wallet className="h-4 w-4" />}
          tone={stats.prepaidTotal > 0 ? 'emerald' : 'neutral'}
          hint={`${stats.prepaidCount} с балансом`}
        />
        <KpiTile
          label="LTV (сумма)"
          value={formatCurrency(stats.ltv, 'UZS')}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="emerald"
          hint="Выручка по клиентам"
        />
      </div>

      <FilterToolbar
        searchValue={search}
        searchPlaceholder="Поиск по имени, телефону, адресу…"
        onSearchChange={setSearch}
      >
        <Select value={segment} onValueChange={(v) => setSegment(v as typeof segment)}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-1 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все клиенты</SelectItem>
            <SelectItem value="active">Только активные</SelectItem>
            <SelectItem value="inactive">Неактивные</SelectItem>
            <SelectItem value="debt">С долгом</SelectItem>
            <SelectItem value="prepaid">С предоплатой</SelectItem>
            <SelectItem value="top">Топ-50 по обороту</SelectItem>
          </SelectContent>
        </Select>
      </FilterToolbar>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Клиент</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>План</TableHead>
                <TableHead className="text-right">Заказов</TableHead>
                <TableHead className="text-right">LTV</TableHead>
                <TableHead className="text-right">Баланс</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    {loading ? 'Загрузка…' : 'Ничего не найдено'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      {c.address && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1">
                          {c.address}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <a
                        href={`tel:${c.phone}`}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </a>
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.assignedSet?.name ? (
                        <Badge variant="secondary">{c.assignedSet.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.totalOrders ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(c.totalSpent ?? 0, 'UZS')}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-bold tabular-nums',
                        (c.balance ?? 0) < 0
                          ? 'text-rose-700'
                          : (c.balance ?? 0) > 0
                          ? 'text-emerald-700'
                          : ''
                      )}
                    >
                      {formatCurrency(c.balance ?? 0, 'UZS')}
                    </TableCell>
                    <TableCell>
                      <EntityStatusBadge
                        isActive={c.isActive !== false}
                        activeLabel="Активен"
                        inactiveLabel="Неактивен"
                        showDot
                      />
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
            <DialogTitle>Новый клиент</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Имя</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Иван Иванов" />
            </div>
            <div>
              <Label className="text-xs">Телефон</Label>
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+998 ..." />
            </div>
            <div>
              <Label className="text-xs">Адрес (опционально)</Label>
              <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="ул. ..." />
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
