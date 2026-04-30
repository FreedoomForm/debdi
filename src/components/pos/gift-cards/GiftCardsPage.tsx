'use client'
/**
 * Gift cards manager.
 *
 * Lists every issued gift card, balance, expiry, and recipient. Cashiers
 * can issue new cards from this page; redemption happens at checkout via the
 * `/api/pos/gift-cards/[code]/redeem` endpoint.
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Check,
  Copy,
  Gift,
  Loader2,
  Plus,
  RefreshCw,
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
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { formatCurrency, formatDateTime } from '@/lib/pos'

type GiftCard = {
  id: string
  code: string
  initialValue: number
  balance: number
  currency: string
  issuedToName?: string | null
  issuedToPhone?: string | null
  issuedAt: string
  expiresAt?: string | null
  isActive: boolean
  notes?: string | null
}

const EMPTY = {
  initialValue: 100000,
  issuedToName: '',
  issuedToPhone: '',
  expiresAt: '',
  notes: '',
}

export function GiftCardsPage() {
  const [items, setItems] = useState<GiftCard[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/gift-cards', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: GiftCard[] }
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
    if (!form.initialValue || form.initialValue <= 0) return
    setBusy(true)
    try {
      const res = await fetch('/api/pos/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          initialValue: form.initialValue,
          issuedToName: form.issuedToName || null,
          issuedToPhone: form.issuedToPhone || null,
          expiresAt: form.expiresAt || null,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { item: GiftCard }
      toast.success(`Карта выпущена: ${data.item.code}`)
      setCreateOpen(false)
      setForm({ ...EMPTY })
      load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось'
      )
    } finally {
      setBusy(false)
    }
  }

  const copy = (code: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard.writeText(code).then(
      () => toast.success(`Код скопирован: ${code}`),
      () => toast.error('Не удалось скопировать')
    )
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Подарочные карты"
        icon={<Gift className="h-4 w-4 text-amber-500" />}
        backHref="/pos/terminal"
        badge={items.length}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
              Обновить
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Выпустить
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-6">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Подарочных карт ещё нет
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Выпустите первую карту, чтобы продавать или дарить её клиентам.
              </p>
              <Button
                className="mt-3"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Выпустить карту
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => {
              const expired =
                c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()
              const usedPct = Math.min(
                100,
                Math.round(
                  ((c.initialValue - c.balance) / Math.max(1, c.initialValue)) *
                    100
                )
              )
              return (
                <article
                  key={c.id}
                  className={cn(
                    'overflow-hidden rounded-xl border bg-gradient-to-br shadow-sm',
                    c.isActive && !expired
                      ? 'border-amber-200 from-amber-50 to-card'
                      : 'border-border from-card to-card opacity-80'
                  )}
                >
                  <header className="flex items-start justify-between gap-2 px-4 pt-4">
                    <div>
                      <div className="font-mono text-base font-bold tracking-wider">
                        {c.code}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        Выпущена {formatDateTime(c.issuedAt)}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => copy(c.code)}
                      aria-label="Скопировать код"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </header>

                  <div className="px-4 pt-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Остаток
                    </div>
                    <div className="text-2xl font-bold tabular-nums">
                      {formatCurrency(c.balance, c.currency as any)}
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${100 - usedPct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Использовано {usedPct}%</span>
                      <span>
                        Из {formatCurrency(c.initialValue, c.currency as any)}
                      </span>
                    </div>
                  </div>

                  <footer className="mt-3 flex items-center justify-between border-t border-border bg-card/50 px-4 py-2.5 text-xs">
                    <div className="min-w-0">
                      {c.issuedToName ? (
                        <>
                          <div className="font-medium">{c.issuedToName}</div>
                          {c.issuedToPhone && (
                            <div className="text-muted-foreground">
                              {c.issuedToPhone}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          На предъявителя
                        </span>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px]',
                        expired
                          ? 'bg-rose-100 text-rose-700'
                          : c.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                      )}
                    >
                      {expired
                        ? 'Истекла'
                        : c.isActive
                          ? '● Активна'
                          : 'Заблок.'}
                    </Badge>
                  </footer>
                </article>
              )
            })}
          </div>
        )}
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Новая подарочная карта</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Номинал (UZS)*
              </Label>
              <Input
                type="number"
                inputMode="numeric"
                value={form.initialValue}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    initialValue: Number(e.target.value) || 0,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Имя получателя
              </Label>
              <Input
                value={form.issuedToName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, issuedToName: e.target.value }))
                }
                placeholder="не обяз."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Телефон получателя
              </Label>
              <Input
                value={form.issuedToPhone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, issuedToPhone: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Действует до
              </Label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) =>
                  setForm((p) => ({ ...p, expiresAt: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Заметка
              </Label>
              <Input
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="напр. подарок ко дню рождения"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={busy}
            >
              <X className="mr-1.5 h-4 w-4" /> Отмена
            </Button>
            <Button onClick={save} disabled={busy || form.initialValue <= 0}>
              {busy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              Выпустить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
