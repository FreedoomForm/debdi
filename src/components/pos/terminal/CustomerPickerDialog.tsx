'use client'
/**
 * Customer picker dialog — opened from the cart panel when the cashier wants
 * to attach a customer to the current order. Supports search by name or phone,
 * shows loyalty / spend stats, and offers a "guest" reset shortcut.
 *
 * Mounted in the POS terminal page; listens to the `pos:open-customer-picker`
 * window event so child components can summon it without prop-drilling.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, User, X, UserPlus, Phone, Crown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/pos'

type Customer = {
  id: string
  name: string
  nickName?: string | null
  phone: string
  balance: number
  totalSpent: number
  totalOrders: number
  lastOrderAt?: string | null
  loyaltyMember?: {
    points: number
    tier?: string | null
    lifetimeSpent: number
  } | null
}

type Props = {
  selectedId?: string | null
  onSelect: (
    customerId: string | null,
    customerName?: string | null,
    customerPhone?: string | null
  ) => void
}

export function CustomerPickerDialog({ selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [creatingOpen, setCreatingOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftPhone, setDraftPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Listen for global open event.
  useEffect(() => {
    const handler = () => {
      setOpen(true)
      setTimeout(() => searchRef.current?.focus(), 60)
    }
    window.addEventListener('pos:open-customer-picker', handler)
    return () => window.removeEventListener('pos:open-customer-picker', handler)
  }, [])

  // Debounced search.
  const search = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/pos/customers/search?q=${encodeURIComponent(q)}`,
        { credentials: 'include' }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items: Customer[] }
      setItems(data.items ?? [])
    } catch {
      // Silent — user keeps typing; toast only on hard fail
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => search(query), 250)
    return () => {
      if (debRef.current) clearTimeout(debRef.current)
    }
  }, [open, query, search])

  const handleSelect = (c: Customer | null) => {
    if (c === null) {
      onSelect(null)
    } else {
      onSelect(c.id, c.name, c.phone)
    }
    setOpen(false)
    setQuery('')
  }

  const handleCreate = async () => {
    if (!draftName.trim() || !draftPhone.trim()) return
    setBusy(true)
    try {
      // We piggy-back on the existing /api/admin/clients endpoint so we
      // don't duplicate logic. (POS-walk-in customers go through the
      // normal customer table.)
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: draftName.trim(),
          phone: draftPhone.trim(),
          address: 'POS',
        }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { client?: Customer; id?: string }
      const newId = data.client?.id ?? data.id
      if (newId) {
        onSelect(newId, draftName.trim(), draftPhone.trim())
        toast.success('Клиент добавлен')
        setCreatingOpen(false)
        setOpen(false)
        setDraftName('')
        setDraftPhone('')
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Выбрать клиента
            </DialogTitle>
            <DialogDescription>
              Введите имя или телефон, чтобы найти клиента, или создайте нового.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              type="search"
              placeholder="Поиск..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 pl-9"
            />
          </div>

          <ScrollArea className="h-[320px] rounded-md border border-border">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                {query.trim()
                  ? 'Ничего не найдено. Создайте нового клиента ниже.'
                  : 'Начните вводить, чтобы увидеть клиентов.'}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((c) => {
                  const isSelected = c.id === selectedId
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(c)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition',
                          isSelected
                            ? 'bg-primary/10'
                            : 'hover:bg-accent'
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{c.name}</span>
                            {c.nickName && (
                              <span className="text-xs text-muted-foreground">
                                ({c.nickName})
                              </span>
                            )}
                            {c.loyaltyMember && (
                              <Badge
                                variant="secondary"
                                className="bg-amber-100 text-amber-700 hover:bg-amber-100"
                              >
                                <Crown className="mr-1 h-3 w-3" />
                                {c.loyaltyMember.points}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {c.phone}
                            </span>
                            {c.totalOrders > 0 && (
                              <span>· {c.totalOrders} заказ.</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold tabular-nums">
                            {formatCurrency(c.totalSpent || 0, 'UZS')}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            всего
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollArea>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => handleSelect(null)}>
              <X className="mr-1.5 h-4 w-4" />
              Гость
            </Button>
            <Button onClick={() => setCreatingOpen(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Новый клиент
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creatingOpen} onOpenChange={setCreatingOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Новый клиент</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Имя*
              </Label>
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Телефон*
              </Label>
              <Input
                value={draftPhone}
                onChange={(e) => setDraftPhone(e.target.value)}
                placeholder="+998..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreatingOpen(false)}
              disabled={busy}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              disabled={busy || !draftName.trim() || !draftPhone.trim()}
            >
              {busy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-1.5 h-4 w-4" />
              )}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
