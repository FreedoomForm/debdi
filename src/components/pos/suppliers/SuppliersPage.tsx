'use client'
/**
 * Suppliers list page.
 *
 * Lightweight CRUD for the supplier directory used by Purchase Orders.
 * Follows the same visual contract as the rest of the POS pages.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Boxes,
  Check,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'

type Supplier = {
  id: string
  name: string
  contactName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  isActive: boolean
}

const EMPTY: Partial<Supplier> = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  isActive: true,
}

export function SuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/suppliers', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: Supplier[] }
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
    if (!q) return items
    return items.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contactName ?? '').toLowerCase().includes(q) ||
        (s.phone ?? '').toLowerCase().includes(q)
    )
  }, [items, query])

  const save = async () => {
    if (!editing?.name?.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/pos/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editing.name,
          contactName: editing.contactName || null,
          phone: editing.phone || null,
          email: editing.email || null,
          address: editing.address || null,
          notes: editing.notes || null,
          isActive: editing.isActive ?? true,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Сохранено')
      setEditing(null)
      load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось сохранить'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PosPageHeader
        title="Поставщики"
        icon={<Boxes className="h-4 w-4 text-amber-500" />}
        backHref="/pos/terminal"
        actions={
          <>
            <div className="relative w-[240px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Поиск"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
              Обновить
            </Button>
            <Button size="sm" onClick={() => setEditing({ ...EMPTY })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Поставщик
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-5xl px-4 py-6">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {items.length === 0
                  ? 'Поставщиков пока нет'
                  : 'Ничего не найдено'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Поставщики используются в закупочных накладных и при приёмке
                товара.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((s) => (
              <article
                key={s.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold leading-tight">
                      {s.name}
                    </div>
                    {s.contactName && (
                      <div className="text-[11px] text-muted-foreground">
                        {s.contactName}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={s.isActive ? 'default' : 'secondary'}
                    className={
                      s.isActive
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                        : ''
                    }
                  >
                    {s.isActive ? '● Активен' : 'Неактивен'}
                  </Badge>
                </header>
                <div className="mt-3 space-y-1.5 text-xs">
                  {s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="h-3 w-3" />
                      {s.phone}
                    </a>
                  )}
                  {s.email && (
                    <a
                      href={`mailto:${s.email}`}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Mail className="h-3 w-3" />
                      {s.email}
                    </a>
                  )}
                  {s.address && (
                    <div className="flex items-start gap-1.5 text-muted-foreground">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>{s.address}</span>
                    </div>
                  )}
                </div>
                {s.notes && (
                  <p className="mt-2 line-clamp-2 text-xs italic text-muted-foreground">
                    {s.notes}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Новый поставщик</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Название*
                </Label>
                <Input
                  value={editing.name ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Контактное лицо
                </Label>
                <Input
                  value={editing.contactName ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, contactName: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Телефон
                </Label>
                <Input
                  value={editing.phone ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, phone: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Email
                </Label>
                <Input
                  type="email"
                  value={editing.email ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Адрес
                </Label>
                <Input
                  value={editing.address ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, address: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Заметки
                </Label>
                <Input
                  value={editing.notes ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, notes: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2 sm:col-span-2">
                <span className="text-sm font-medium">Активен</span>
                <Switch
                  checked={editing.isActive ?? true}
                  onCheckedChange={(v) =>
                    setEditing({ ...editing, isActive: v })
                  }
                />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={busy}
            >
              <X className="mr-1.5 h-4 w-4" /> Отмена
            </Button>
            <Button onClick={save} disabled={busy || !editing?.name?.trim()}>
              {busy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
