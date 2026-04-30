'use client'
/**
 * /t/[token] — public QR-table ordering page (no auth).
 *
 * Customers scan the sticker on their table and land here. They browse
 * the live menu (only isActive products), build a cart, and submit a
 * draft order that staff confirm in /pos/orders.
 *
 * Inspired by Odoo PoS, Square QR-order, Toast QR ordering.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Utensils,
  X,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Category = {
  id: string
  name: string
  color?: string | null
}

type Product = {
  id: string
  name: string
  description?: string | null
  sellPrice: number
  imageUrl?: string | null
  categoryId?: string | null
  unit?: string
  color?: string | null
}

type Menu = {
  storeName: string
  table: { id: string; name: string; section: string | null }
  categories: Category[]
  products: Product[]
}

type CartLine = {
  productId: string
  name: string
  quantity: number
  unitPrice: number
}

function formatUZS(n: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(n))} сум`
}

export default function QrTablePage({ token }: { token: string }) {
  const [menu, setMenu] = useState<Menu | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [cart, setCart] = useState<Record<string, CartLine>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/public/qr-table/${token}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as Menu
      setMenu(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить меню')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const filteredProducts = useMemo(() => {
    if (!menu) return []
    const q = search.trim().toLowerCase()
    return menu.products.filter((p) => {
      if (activeCat && p.categoryId !== activeCat) return false
      if (q && !p.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [menu, search, activeCat])

  const cartLines = Object.values(cart)
  const cartTotal = cartLines.reduce(
    (sum, l) => sum + l.unitPrice * l.quantity,
    0
  )
  const cartCount = cartLines.reduce((sum, l) => sum + l.quantity, 0)

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev[p.id]
      return {
        ...prev,
        [p.id]: existing
          ? { ...existing, quantity: existing.quantity + 1 }
          : {
              productId: p.id,
              name: p.name,
              quantity: 1,
              unitPrice: p.sellPrice,
            },
      }
    })
  }

  const decrement = (productId: string) => {
    setCart((prev) => {
      const existing = prev[productId]
      if (!existing) return prev
      if (existing.quantity <= 1) {
        const { [productId]: _, ...rest } = prev
        return rest
      }
      return {
        ...prev,
        [productId]: { ...existing, quantity: existing.quantity - 1 },
      }
    })
  }

  const removeLine = (productId: string) => {
    setCart((prev) => {
      const { [productId]: _, ...rest } = prev
      return rest
    })
  }

  const submit = async () => {
    if (cartLines.length === 0) {
      toast.error('Корзина пуста')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/qr-table/${token}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: cartLines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
          })),
          note: note.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      setSubmitted(true)
      setCart({})
      setNote('')
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Не удалось отправить заказ: ${err.message}`
          : 'Ошибка'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !menu) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <Utensils className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <h1 className="mb-1 text-base font-semibold">Меню недоступно</h1>
          <p className="text-sm text-muted-foreground">
            {error ?? 'QR-код стола неактивен или отозван. Обратитесь к официанту.'}
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
          <h1 className="mb-1 text-lg font-semibold">Заказ отправлен!</h1>
          <p className="mb-4 text-sm text-muted-foreground">
            Официант подойдёт к столу {menu.table.name}, чтобы подтвердить заказ и принять оплату.
          </p>
          <Button onClick={() => setSubmitted(false)} className="w-full">
            Заказать ещё
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold">{menu.storeName}</h1>
            <div className="text-[11px] text-muted-foreground">
              Стол {menu.table.name}
              {menu.table.section ? ` · ${menu.table.section}` : ''}
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            QR-меню
          </Badge>
        </div>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по меню…"
            className="h-9 pl-8"
          />
        </div>
        {menu.categories.length > 0 && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveCat(null)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition',
                activeCat === null
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground'
              )}
            >
              Все
            </button>
            {menu.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(c.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition',
                  activeCat === c.id
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-muted-foreground'
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="px-4 py-4">
        {filteredProducts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Ничего не найдено.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredProducts.map((p) => {
              const qty = cart[p.id]?.quantity ?? 0
              return (
                <li
                  key={p.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                >
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-24 w-full object-cover"
                    />
                  ) : (
                    <div
                      className="grid h-24 w-full place-items-center text-xs text-muted-foreground"
                      style={{ background: p.color ?? undefined }}
                    >
                      <Utensils className="h-5 w-5 opacity-50" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-2.5">
                    <div className="text-sm font-semibold leading-tight line-clamp-2">
                      {p.name}
                    </div>
                    {p.description && (
                      <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                        {p.description}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm font-bold tabular-nums">
                        {formatUZS(p.sellPrice)}
                      </div>
                      {qty > 0 ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => decrement(p.id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="min-w-[16px] text-center text-sm font-bold tabular-nums">
                            {qty}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => addToCart(p)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="h-7"
                          onClick={() => addToCart(p)}
                        >
                          <Plus className="mr-0.5 h-3 w-3" /> В корзину
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {/* Sticky cart bar */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card shadow-2xl">
          <div className="mx-auto max-w-3xl space-y-2 p-3">
            <details className="rounded-md border border-border">
              <summary className="flex cursor-pointer items-center justify-between p-2 text-sm">
                <span className="font-semibold">
                  В корзине: {cartCount} поз. · {formatUZS(cartTotal)}
                </span>
                <span className="text-xs text-muted-foreground">показать</span>
              </summary>
              <ul className="divide-y divide-border">
                {cartLines.map((l) => (
                  <li
                    key={l.productId}
                    className="flex items-center gap-2 p-2 text-sm"
                  >
                    <div className="flex-1 truncate">{l.name}</div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        onClick={() => decrement(l.productId)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-5 text-center text-sm font-bold tabular-nums">
                        {l.quantity}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          setCart((prev) => ({
                            ...prev,
                            [l.productId]: {
                              ...l,
                              quantity: l.quantity + 1,
                            },
                          }))
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => removeLine(l.productId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="w-20 text-right text-xs font-semibold tabular-nums">
                      {formatUZS(l.unitPrice * l.quantity)}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Комментарий для официанта (необязательно)"
              maxLength={280}
              className="h-9 text-sm"
            />
            <Button
              onClick={submit}
              disabled={submitting}
              className="h-11 w-full text-sm font-semibold"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="mr-2 h-4 w-4" />
              )}
              Отправить заказ · {formatUZS(cartTotal)}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
