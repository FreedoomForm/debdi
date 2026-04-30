'use client'
/**
 * /pos/trash — modern trash bin for deleted clients & orders.
 *
 * New UI counterpart of the legacy /middle-admin?tab=bin view.
 * Reuses existing endpoints — no new API surface needed:
 *   GET    /api/admin/clients/bin
 *   POST   /api/admin/clients/restore         { clientIds: string[] }
 *   DELETE /api/admin/clients/permanent-delete{ clientIds: string[] }
 *   GET    /api/orders?deletedOnly=true
 *
 * Old UI preserved untouched — both views coexist via the unified nav.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Users,
  Receipt,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/pos'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'

type BinClient = {
  id: string
  name: string
  phone: string
  address?: string | null
  isActive: boolean
  deletedAt?: string | null
  deletedBy?: string | null
  createdAt: string
}

type BinOrder = {
  id: string
  orderNumber?: number
  status?: string
  total?: number
  grandTotal?: number
  deletedAt?: string | null
  customer?: { name?: string; phone?: string } | null
  createdAt: string
}

export default function TrashPage() {
  const [clients, setClients] = useState<BinClient[]>([])
  const [orders, setOrders] = useState<BinOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [active, setActive] = useState<'clients' | 'orders'>('clients')
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, oRes] = await Promise.all([
        fetch('/api/admin/clients/bin', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/orders?deletedOnly=true', { credentials: 'include', cache: 'no-store' }),
      ])
      const cData = cRes.ok ? await cRes.json() : []
      const oData = oRes.ok ? await oRes.json() : []
      setClients(Array.isArray(cData) ? cData : cData?.items ?? [])
      setOrders(Array.isArray(oData) ? oData : oData?.items ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filteredClients = useMemo(() => {
    if (!search) return clients
    const q = search.toLowerCase()
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.address ?? '').toLowerCase().includes(q)
    )
  }, [clients, search])

  const filteredOrders = useMemo(() => {
    if (!search) return orders
    const q = search.toLowerCase()
    return orders.filter(
      (o) =>
        String(o.orderNumber ?? '').includes(q) ||
        (o.customer?.name ?? '').toLowerCase().includes(q) ||
        (o.customer?.phone ?? '').toLowerCase().includes(q)
    )
  }, [orders, search])

  const toggleClient = (id: string) => {
    setSelectedClients((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleOrder = (id: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const selectAllClients = () => {
    if (selectedClients.size === filteredClients.length) setSelectedClients(new Set())
    else setSelectedClients(new Set(filteredClients.map((c) => c.id)))
  }
  const selectAllOrders = () => {
    if (selectedOrders.size === filteredOrders.length) setSelectedOrders(new Set())
    else setSelectedOrders(new Set(filteredOrders.map((o) => o.id)))
  }

  const restoreClients = async () => {
    if (selectedClients.size === 0) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/clients/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientIds: Array.from(selectedClients) }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success(`Восстановлено: ${selectedClients.size} клиентов`)
      setSelectedClients(new Set())
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setBusy(false)
    }
  }

  const permanentDeleteClients = async () => {
    if (selectedClients.size === 0) return
    if (!confirm(`Окончательно удалить ${selectedClients.size} клиентов? Это действие необратимо.`)) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/clients/permanent-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientIds: Array.from(selectedClients) }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success(`Удалено навсегда: ${selectedClients.size}`)
      setSelectedClients(new Set())
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setBusy(false)
    }
  }

  const restoreOrders = async () => {
    if (selectedOrders.size === 0) return
    setBusy(true)
    let success = 0
    let failed = 0
    try {
      for (const id of Array.from(selectedOrders)) {
        const res = await fetch(`/api/orders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ restore: true }),
        })
        if (res.ok) success++
        else failed++
      }
      if (success > 0) toast.success(`Восстановлено заказов: ${success}`)
      if (failed > 0) toast.error(`Не удалось восстановить: ${failed}`)
      setSelectedOrders(new Set())
      await load()
    } finally {
      setBusy(false)
    }
  }

  const permanentDeleteOrders = async () => {
    if (selectedOrders.size === 0) return
    if (!confirm(`Окончательно удалить ${selectedOrders.size} заказов? Это действие необратимо.`)) return
    setBusy(true)
    let success = 0
    try {
      for (const id of Array.from(selectedOrders)) {
        const res = await fetch(`/api/orders/${id}?permanent=true`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (res.ok) success++
      }
      toast.success(`Удалено навсегда: ${success}`)
      setSelectedOrders(new Set())
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PosPageHeader
        title="Корзина"
        icon={<Trash2 className="h-4 w-4 text-rose-500" />}
        badge={clients.length + orders.length}
        actions={
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
            Обновить
          </Button>
        }
      />

      <main className="mx-auto max-w-[1400px] space-y-3 p-3 lg:p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <KpiTile label="Клиентов в корзине" value={clients.length} tone="rose" icon={<Users className="h-3 w-3" />} />
          <KpiTile label="Заказов в корзине" value={orders.length} tone="rose" icon={<Receipt className="h-3 w-3" />} />
          <KpiTile label="Выбрано клиентов" value={selectedClients.size} tone={selectedClients.size > 0 ? 'amber' : 'neutral'} icon={<Users className="h-3 w-3" />} />
          <KpiTile label="Выбрано заказов" value={selectedOrders.size} tone={selectedOrders.size > 0 ? 'amber' : 'neutral'} icon={<Receipt className="h-3 w-3" />} />
        </div>

        <Tabs value={active} onValueChange={(v) => setActive(v as typeof active)}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="clients">
                <Users className="mr-1 h-3.5 w-3.5" />
                Клиенты ({clients.length})
              </TabsTrigger>
              <TabsTrigger value="orders">
                <Receipt className="mr-1 h-3.5 w-3.5" />
                Заказы ({orders.length})
              </TabsTrigger>
            </TabsList>
            <div className="relative max-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск…"
                className="pl-8"
              />
            </div>
          </div>

          <TabsContent value="clients" className="mt-3 space-y-2">
            {selectedClients.size > 0 && (
              <ActionBar
                count={selectedClients.size}
                busy={busy}
                onRestore={restoreClients}
                onDelete={permanentDeleteClients}
                onClear={() => setSelectedClients(new Set())}
              />
            )}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="grid place-items-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredClients.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Корзина пуста
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            checked={
                              filteredClients.length > 0 &&
                              selectedClients.size === filteredClients.length
                            }
                            onChange={selectAllClients}
                          />
                        </TableHead>
                        <TableHead>Имя</TableHead>
                        <TableHead>Телефон</TableHead>
                        <TableHead>Адрес</TableHead>
                        <TableHead>Удалён</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((c) => (
                        <TableRow
                          key={c.id}
                          className={cn(selectedClients.has(c.id) && 'bg-amber-50/30')}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedClients.has(c.id)}
                              onChange={() => toggleClient(c.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.phone}</TableCell>
                          <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                            {c.address ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground tabular-nums">
                            {c.deletedAt
                              ? new Date(c.deletedAt).toLocaleString('ru-RU')
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-3 space-y-2">
            {selectedOrders.size > 0 && (
              <ActionBar
                count={selectedOrders.size}
                busy={busy}
                onRestore={restoreOrders}
                onDelete={permanentDeleteOrders}
                onClear={() => setSelectedOrders(new Set())}
              />
            )}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="grid place-items-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Удалённых заказов нет
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            checked={
                              filteredOrders.length > 0 &&
                              selectedOrders.size === filteredOrders.length
                            }
                            onChange={selectAllOrders}
                          />
                        </TableHead>
                        <TableHead>№</TableHead>
                        <TableHead>Клиент</TableHead>
                        <TableHead className="text-right">Сумма</TableHead>
                        <TableHead>Удалён</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((o) => (
                        <TableRow
                          key={o.id}
                          className={cn(selectedOrders.has(o.id) && 'bg-amber-50/30')}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedOrders.has(o.id)}
                              onChange={() => toggleOrder(o.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium tabular-nums">
                            #{o.orderNumber ?? o.id.slice(0, 6)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{o.customer?.name ?? '—'}</div>
                            {o.customer?.phone && (
                              <div className="text-[11px] text-muted-foreground">
                                {o.customer.phone}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums">
                            {formatCurrency(o.grandTotal ?? o.total ?? 0, 'UZS')}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground tabular-nums">
                            {o.deletedAt
                              ? new Date(o.deletedAt).toLocaleString('ru-RU')
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function ActionBar({
  count,
  busy,
  onRestore,
  onDelete,
  onClear,
}: {
  count: number
  busy: boolean
  onRestore: () => void
  onDelete: () => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm">
      <span className="font-medium">Выбрано: {count}</span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={onRestore} disabled={busy}>
          {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1 h-3.5 w-3.5" />}
          Восстановить
        </Button>
        <Button size="sm" variant="destructive" onClick={onDelete} disabled={busy}>
          {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1 h-3.5 w-3.5" />}
          Удалить навсегда
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear} disabled={busy}>
          Снять выбор
        </Button>
      </div>
    </div>
  )
}
