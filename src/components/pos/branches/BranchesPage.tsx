'use client'
/**
 * Branches / locations manager.
 *
 * Lists all configured branches for the current owner. Each branch has its
 * own currency, tax rate, and time zone — useful for chains operating across
 * regions.
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Check,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Store,
  X,
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
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { formatPercent } from '@/lib/pos'

type Branch = {
  id: string
  name: string
  code?: string | null
  address?: string | null
  phone?: string | null
  latitude?: number | null
  longitude?: number | null
  timezone: string
  currency: string
  taxRate: number
  isActive: boolean
}

const EMPTY: Partial<Branch> = {
  name: '',
  code: '',
  address: '',
  phone: '',
  timezone: 'Asia/Tashkent',
  currency: 'UZS',
  taxRate: 0.12,
  isActive: true,
}

export function BranchesPage() {
  const [items, setItems] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Branch> | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/branches', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: Branch[] }
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

  const save = async () => {
    if (!editing?.name?.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/pos/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editing.name,
          code: editing.code || null,
          address: editing.address || null,
          phone: editing.phone || null,
          timezone: editing.timezone || 'Asia/Tashkent',
          currency: editing.currency || 'UZS',
          taxRate: editing.taxRate ?? 0,
          isActive: editing.isActive ?? true,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Сохранено')
      setEditing(null)
      load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PosPageHeader
        title="Филиалы"
        icon={<Store className="h-4 w-4 text-amber-500" />}
        badge={items.length}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
              Обновить
            </Button>
            <Button size="sm" onClick={() => setEditing({ ...EMPTY })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Филиал
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-5xl px-4 py-6">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Филиалов пока нет. Если у вас одна локация — это нормально, иначе
              добавьте каждое заведение здесь.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((b) => (
              <article
                key={b.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold leading-tight">
                      {b.name}
                    </div>
                    {b.code && (
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {b.code}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      b.isActive
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                        : ''
                    }
                  >
                    {b.isActive ? '● Активен' : 'Неактивен'}
                  </Badge>
                </header>
                <dl className="mt-3 space-y-1 text-xs">
                  {b.address && (
                    <div className="flex items-start gap-1.5 text-muted-foreground">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>{b.address}</span>
                    </div>
                  )}
                  {b.phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <a
                        href={`tel:${b.phone}`}
                        className="hover:text-foreground"
                      >
                        {b.phone}
                      </a>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-[11px]">
                    <div>
                      <div className="text-muted-foreground">Валюта</div>
                      <div className="font-medium">{b.currency}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Налог</div>
                      <div className="font-medium">
                        {formatPercent(b.taxRate || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Часовой пояс</div>
                      <div className="font-medium">{b.timezone.split('/').pop()}</div>
                    </div>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Новый филиал</DialogTitle>
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
                  Код
                </Label>
                <Input
                  value={editing.code ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, code: e.target.value.toUpperCase() })
                  }
                  placeholder="напр. DT01"
                  className="mt-1 font-mono"
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
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Часовой пояс
                </Label>
                <Select
                  value={editing.timezone ?? 'Asia/Tashkent'}
                  onValueChange={(v) => setEditing({ ...editing, timezone: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Tashkent">Asia/Tashkent</SelectItem>
                    <SelectItem value="Asia/Almaty">Asia/Almaty</SelectItem>
                    <SelectItem value="Asia/Dushanbe">Asia/Dushanbe</SelectItem>
                    <SelectItem value="Europe/Moscow">Europe/Moscow</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Валюта
                </Label>
                <Select
                  value={editing.currency ?? 'UZS'}
                  onValueChange={(v) => setEditing({ ...editing, currency: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UZS">UZS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="RUB">RUB</SelectItem>
                    <SelectItem value="KZT">KZT</SelectItem>
                    <SelectItem value="TJS">TJS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Налог (%)
                </Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={Math.round((editing.taxRate ?? 0) * 1000) / 10}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      taxRate: (Number(e.target.value) || 0) / 100,
                    })
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
