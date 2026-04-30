'use client'
/**
 * QrTablePage — public customer-facing page reached by scanning a QR
 * sticker on a restaurant table. Shows the live menu and lets guests
 * place an order from their phone without installing anything.
 *
 * Inspired by Odoo PoS QR-table ordering and Square's "order at table"
 * feature. Backed by /api/public/qr-table/:token (no auth, scoped by token).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Loader2,
  Plus,
  Minus,
  ShoppingBag,
  Send,
  CheckCircle2,
  Search,
  Utensils,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Category = {
  id: string
  name: string
  color?: string | null
  sortOrder?: number
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

type Payload = {
  storeName: string
  table: { id: string; name: string; section: string | null }
  categories: Category[]
  products: Product[]
}

function formatUZS(n: number): string {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(n) + ' сум'
}

export default function QrTablePage({ token }: { token: string }) {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string | 'all'>('all')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [showCart, setShowCart] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/public/qr-table/${token}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'QR не активен')
      }
      const payload: Payload = await res.json()
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить меню')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.products.filter((p) => {
      if (activeCat !== 'all' && p.categoryId !== activeCat) return false
      if (q && !p.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [data, search, activeCat])

  const totals = useMemo(() => {
    if (!data) return { items: 0, total: 0 }
    let items = 0
    let total = 0
    for (const p of data.products) {
      const q = cart[p.id] ?? 0
      if (q > 0) {
        items += q
        total += q * p.sellPrice
      }
    }
    return { items, total }
  }, [cart, data])

  const inc = (id: string) =>
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }))
  const dec = (id: string) =>
    setCart((c) => {
      const next = { ...c }
      const v = (next[id] ?? 0) - 1
      if (v <= 0) delete next[id]
      else next[id] = v
      return next
    })

  const submit = async () => {
    if (totals.items === 0) return
    if (!name.trim()) {
      alert('Укажите имя для официанта')
      return
    }
    setSubmitting(true)
    try {
      const items = Object.entries(cart).map(([productId, qty]) => ({
        productId,
        quantity: qty,
      }))
      const res = await fetch(`/api/public/qr-table/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, name, phone, notes }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Не удалось отправить заказ')
      }
      setSubmitted(true)
      setCart({})
      setShowCart(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="grid h-screen place-items-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-sm rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <X className="mx-auto h-8 w-8 text-rose-500" />
          <h1 className="mt-2 text-lg font-bold">Меню недоступно</h1>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="grid h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-sm rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-2 text-xl font-bold">Заказ принят!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Официант скоро подтвердит ваш заказ. Спасибо!
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Заказать ещё
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold">{data.storeName}</h1>
              <p className="text-[11px] text-muted-foreground">
                <Utensils className="-mt-0.5 mr-1 inline-block h-3 w-3" />
                Стол {data.table.name}
                {data.table.section && ` · ${data.table.section}`}
              </p>
            </div>
          </div>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск блюда…"
              className="w-full rounded-xl border border-input bg-white px-3 py-2 pl-9 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
        </div>
        {/* Category chips */}
        <div className="overflow-x-auto px-4 pb-2 pt-1">
          <div className="mx-auto flex max-w-2xl gap-1.5">
            <button
              onClick={() => setActiveCat('all')}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
                activeCat === 'all'
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : 'border-border bg-white text-foreground'
              )}
            >
              Всё
            </button>
            {data.categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
                  activeCat === c.id
                    ? 'border-amber-500 bg-amber-500 text-white'
                    : 'border-border bg-white text-foreground'
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Products */}
      <main className="mx-auto max-w-2xl px-4 py-4">
        {visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Ничего не найдено
          </p>
        ) : (
          <ul className="space-y-2">
            {visible.map((p) => {
              const qty = cart[p.id] ?? 0
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-white p-3 shadow-sm"
                >
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div
                      className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-amber-100 text-2xl"
                      style={p.color ? { background: p.color + '20' } : undefined}
                    >
                      🍽️
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold">{p.name}</h3>
                    {p.description && (
                      <p className="line-clamp-2 text-[11px] text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-1 text-sm font-bold tabular-nums">
                      {formatUZS(p.sellPrice)}
                    </div>
                  </div>
                  {qty === 0 ? (
                    <button
                      onClick={() => inc(p.id)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-500 text-white shadow-sm hover:bg-amber-600"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => dec(p.id)}
                        className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 hover:bg-slate-300"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold tabular-nums">
                        {qty}
                      </span>
                      <button
                        onClick={() => inc(p.id)}
                        className="grid h-8 w-8 place-items-center rounded-full bg-amber-500 text-white hover:bg-amber-600"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {/* Sticky cart bar */}
      {totals.items > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-4 left-4 right-4 z-20 mx-auto flex max-w-xl items-center justify-between rounded-2xl bg-amber-500 px-4 py-3 text-white shadow-lg active:scale-95"
        >
          <span className="flex items-center gap-2 font-semibold">
            <ShoppingBag className="h-4 w-4" />
            {totals.items} {totals.items === 1 ? 'позиция' : 'позиций'}
          </span>
          <span className="font-bold tabular-nums">{formatUZS(totals.total)}</span>
        </button>
      )}

      {/* Cart sheet */}
      {showCart && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40"
          onClick={() => setShowCart(false)}
        >
          <div
            className="w-full max-w-xl rounded-t-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Ваш заказ</h2>
              <button onClick={() => setShowCart(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="mt-2 max-h-[40vh] space-y-1 overflow-y-auto">
              {Object.entries(cart).map(([id, qty]) => {
                const p = data.products.find((x) => x.id === id)
                if (!p) return null
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm"
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        × {qty}
                      </span>
                    </div>
                    <span className="font-bold tabular-nums">
                      {formatUZS(qty * p.sellPrice)}
                    </span>
                  </li>
                )
              })}
            </ul>
            <div className="mt-3 space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя*"
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Телефон (необязательно)"
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                inputMode="tel"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Комментарий для официанта…"
                rows={2}
                className="w-full resize-none rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
              <span className="text-sm text-muted-foreground">Итого</span>
              <span className="text-lg font-bold tabular-nums">
                {formatUZS(totals.total)}
              </span>
            </div>
            <button
              onClick={submit}
              disabled={submitting || totals.items === 0}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Отправить заказ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
