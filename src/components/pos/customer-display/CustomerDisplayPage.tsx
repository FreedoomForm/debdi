'use client'
/**
 * Customer-facing display.
 *
 * Designed for a second screen (or tablet flipped toward the customer) that
 * mirrors the cashier's cart in real time. Reads the cart from
 * localStorage with a BroadcastChannel listener so multiple tabs/screens
 * stay in sync without a server round-trip.
 *
 * Looks deliberately calm: oversized type, generous whitespace, the chain's
 * deep-navy + amber palette, and the running total bottom-pinned for clarity.
 */
import { useEffect, useMemo, useState } from 'react'
import { Sparkles, ShoppingCart } from 'lucide-react'
import {
  computeCartTotals,
  formatCurrency,
  type CartLine,
} from '@/lib/pos'

const STORAGE_KEY = 'debdi:pos:cart:v1'

type CartSnapshot = {
  lines: CartLine[]
  cartDiscount: number
  cartDiscountIsPercent: boolean
  tip: number
}

const EMPTY: CartSnapshot = {
  lines: [],
  cartDiscount: 0,
  cartDiscountIsPercent: false,
  tip: 0,
}

export function CustomerDisplayPage() {
  const [snap, setSnap] = useState<CartSnapshot>(EMPTY)
  const [pulseId, setPulseId] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  const refresh = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        setSnap(EMPTY)
        return
      }
      const parsed = JSON.parse(raw) as Partial<CartSnapshot>
      const next: CartSnapshot = {
        lines: parsed.lines ?? [],
        cartDiscount: parsed.cartDiscount ?? 0,
        cartDiscountIsPercent: parsed.cartDiscountIsPercent ?? false,
        tip: parsed.tip ?? 0,
      }
      // Detect a newly-added line for the pulse animation.
      setSnap((prev) => {
        if (next.lines.length > prev.lines.length) {
          const fresh = next.lines.find(
            (l) => !prev.lines.some((p) => p.id === l.id)
          )
          if (fresh) setPulseId(fresh.id)
        }
        return next
      })
    } catch {
      setSnap(EMPTY)
    }
  }

  useEffect(() => {
    refresh()
    // Cross-tab listener — keeps the customer screen in lockstep with the
    // cashier's terminal even when localStorage is updated elsewhere.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh()
    }
    window.addEventListener('storage', onStorage)
    // Belt-and-braces poll for same-tab updates (storage event does not
    // fire in the originating tab).
    const t = setInterval(refresh, 500)
    return () => {
      window.removeEventListener('storage', onStorage)
      clearInterval(t)
    }
  }, [])

  // Tick clock every second for the empty-state animation.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Clear the pulse after the highlight animation finishes.
  useEffect(() => {
    if (!pulseId) return
    const t = setTimeout(() => setPulseId(null), 1100)
    return () => clearTimeout(t)
  }, [pulseId])

  const totals = useMemo(
    () =>
      computeCartTotals(snap.lines, {
        cartDiscount: snap.cartDiscount,
        cartDiscountIsPercent: snap.cartDiscountIsPercent,
        tip: snap.tip,
      }),
    [snap]
  )

  const isEmpty = snap.lines.length === 0

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      {/* Brand bar */}
      <header className="flex h-16 shrink-0 items-center justify-between bg-black/30 px-8 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-black">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">Debdi POS</h1>
            <p className="text-[11px] text-slate-400">
              Добро пожаловать! Спасибо, что выбрали нас.
            </p>
          </div>
        </div>
        <time className="font-mono text-sm tabular-nums text-slate-400">
          {new Date(now).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </time>
      </header>

      {/* Body */}
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="grid h-32 w-32 place-items-center rounded-full bg-amber-500/10 text-amber-400">
            <ShoppingCart className="h-14 w-14" strokeWidth={1.4} />
          </div>
          <h2 className="mt-8 text-4xl font-bold tracking-tight">
            Подождите немного…
          </h2>
          <p className="mt-3 max-w-md text-lg text-slate-400">
            Кассир принимает ваш заказ.
          </p>
          <div className="mt-10 flex gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400 [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400 [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[2fr_1fr]">
          {/* Items list */}
          <section className="flex min-h-0 flex-col">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Ваш заказ
              </h2>
              <span className="text-sm tabular-nums text-slate-300">
                {totals.itemsCount} поз.
              </span>
            </div>
            <ul className="flex-1 divide-y divide-white/5 overflow-y-auto px-8 py-2">
              {snap.lines.map((l) => {
                const lineTotal =
                  (l.unitPrice +
                    (l.modifiers || []).reduce(
                      (s, m) => s + (m.priceDelta || 0),
                      0
                    )) *
                    l.quantity -
                  (l.discount || 0)
                const isPulse = pulseId === l.id
                return (
                  <li
                    key={l.id}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3 transition ${
                      isPulse ? 'animate-pulse' : ''
                    }`}
                    style={
                      isPulse
                        ? {
                            background:
                              'linear-gradient(90deg, rgba(245,158,11,0.18), transparent)',
                          }
                        : undefined
                    }
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-base font-bold text-amber-300">
                      {l.quantity}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-lg font-semibold leading-tight">
                        {l.name}
                      </div>
                      {l.modifiers && l.modifiers.length > 0 && (
                        <div className="mt-0.5 truncate text-sm text-slate-400">
                          {l.modifiers.map((m) => m.name).join(' · ')}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold tabular-nums">
                        {formatCurrency(lineTotal, 'UZS')}
                      </div>
                      <div className="text-xs tabular-nums text-slate-500">
                        {formatCurrency(l.unitPrice, 'UZS')} × {l.quantity}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Totals */}
          <section className="flex flex-col justify-end border-l border-white/10 bg-black/20 p-8">
            <dl className="space-y-2 text-base">
              <Row
                label="Подытог"
                value={formatCurrency(totals.subtotal, 'UZS')}
              />
              {totals.discountTotal > 0 && (
                <Row
                  label="Скидка"
                  value={`-${formatCurrency(totals.discountTotal, 'UZS')}`}
                  tone="discount"
                />
              )}
              {totals.taxTotal > 0 && (
                <Row
                  label="Налог"
                  value={formatCurrency(totals.taxTotal, 'UZS')}
                />
              )}
              {totals.tipTotal > 0 && (
                <Row
                  label="Чаевые"
                  value={formatCurrency(totals.tipTotal, 'UZS')}
                />
              )}
            </dl>
            <div className="mt-6 border-t border-white/10 pt-6">
              <div className="text-sm uppercase tracking-wider text-slate-400">
                К оплате
              </div>
              <div className="mt-2 text-6xl font-extrabold tabular-nums tracking-tight text-amber-400">
                {formatCurrency(totals.grandTotal, 'UZS')}
              </div>
            </div>
            <p className="mt-6 text-xs text-slate-500">
              Пожалуйста, подтвердите сумму перед оплатой.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'discount'
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-slate-400">{label}</dt>
      <dd
        className={`tabular-nums ${
          tone === 'discount' ? 'text-emerald-400 font-semibold' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
