'use client'
/**
 * Lightweight cart store — uses React state + localStorage persistence,
 * no external dependency. Suitable for a single-cashier session.
 *
 * For multi-tab / multi-cashier sync the store could be swapped for a
 * BroadcastChannel-backed implementation; the public hook API stays the same.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  computeCartTotals,
  makeCartLineId,
  type CartLine,
  type OrderItemModifier,
  type PosProduct,
  type ServiceMode,
  type CartTotals,
} from '@/lib/pos'

const STORAGE_KEY = 'debdi:pos:cart:v1'

export type CartState = {
  lines: CartLine[]
  customerId: string | null
  customerName: string | null
  customerPhone: string | null
  tableId: string | null
  guestCount: number | null
  serviceMode: ServiceMode
  cartDiscount: number
  cartDiscountIsPercent: boolean
  tip: number
  notes: string
  appliedPromoCode: string | null
}

const INITIAL: CartState = {
  lines: [],
  customerId: null,
  customerName: null,
  customerPhone: null,
  tableId: null,
  guestCount: null,
  serviceMode: 'DINE_IN',
  cartDiscount: 0,
  cartDiscountIsPercent: false,
  tip: 0,
  notes: '',
  appliedPromoCode: null,
}

function load(): CartState {
  if (typeof window === 'undefined') return INITIAL
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL
    const parsed = JSON.parse(raw)
    return { ...INITIAL, ...parsed }
  } catch {
    return INITIAL
  }
}

function save(state: CartState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota / private mode */
  }
}

export function useCart() {
  const [state, setState] = useState<CartState>(INITIAL)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    setState(load())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) save(state)
  }, [state, hydrated])

  const totals: CartTotals = useMemo(
    () =>
      computeCartTotals(state.lines, {
        cartDiscount: state.cartDiscount,
        cartDiscountIsPercent: state.cartDiscountIsPercent,
        tip: state.tip,
      }),
    [state.lines, state.cartDiscount, state.cartDiscountIsPercent, state.tip]
  )

  const addProduct = useCallback(
    (
      product: PosProduct,
      quantity: number = 1,
      variantId?: string | null,
      modifiers: OrderItemModifier[] = [],
      notes?: string
    ) => {
      setState((s) => {
        // If the same product (same variant + same modifier set) is in cart
        // already, just increment its quantity.
        const variantPriceDelta = variantId
          ? product.variants?.find((v) => v.id === variantId)?.priceDelta ?? 0
          : 0
        const variantName = variantId
          ? product.variants?.find((v) => v.id === variantId)?.name
          : null
        const existing = s.lines.find(
          (l) =>
            l.productId === product.id &&
            l.variantId === (variantId ?? null) &&
            sameModifiers(l.modifiers, modifiers) &&
            (l.notes || '') === (notes || '')
        )
        if (existing) {
          return {
            ...s,
            lines: s.lines.map((l) =>
              l.id === existing.id
                ? { ...l, quantity: l.quantity + quantity }
                : l
            ),
          }
        }
        const newLine: CartLine = {
          id: makeCartLineId(),
          productId: product.id,
          variantId: variantId ?? null,
          name: variantName ? `${product.name} · ${variantName}` : product.name,
          sku: product.sku ?? null,
          quantity,
          unitPrice: product.sellPrice + variantPriceDelta,
          discount: 0,
          taxRate: product.taxRate,
          modifiers,
          notes,
          imageUrl: product.imageUrl,
          color: product.color,
        }
        return { ...s, lines: [...s.lines, newLine] }
      })
    },
    []
  )

  const updateLine = useCallback(
    (id: string, patch: Partial<CartLine>) => {
      setState((s) => ({
        ...s,
        lines: s.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }))
    },
    []
  )

  const incrementLine = useCallback(
    (id: string, delta: number) => {
      setState((s) => ({
        ...s,
        lines: s.lines.flatMap((l) => {
          if (l.id !== id) return [l]
          const q = l.quantity + delta
          if (q <= 0) return []
          return [{ ...l, quantity: q }]
        }),
      }))
    },
    []
  )

  const removeLine = useCallback((id: string) => {
    setState((s) => ({ ...s, lines: s.lines.filter((l) => l.id !== id) }))
  }, [])

  const clear = useCallback(() => {
    setState(INITIAL)
  }, [])

  const setCustomer = useCallback(
    (
      customerId: string | null,
      customerName?: string | null,
      customerPhone?: string | null
    ) => {
      setState((s) => ({
        ...s,
        customerId,
        customerName: customerName ?? null,
        customerPhone: customerPhone ?? null,
      }))
    },
    []
  )

  const setTable = useCallback(
    (tableId: string | null, guestCount?: number | null) => {
      setState((s) => ({
        ...s,
        tableId,
        guestCount: guestCount ?? s.guestCount,
      }))
    },
    []
  )

  const setServiceMode = useCallback((mode: ServiceMode) => {
    setState((s) => ({ ...s, serviceMode: mode }))
  }, [])

  const setCartDiscount = useCallback((value: number, isPercent = false) => {
    setState((s) => ({
      ...s,
      cartDiscount: Math.max(0, value),
      cartDiscountIsPercent: isPercent,
    }))
  }, [])

  const setTip = useCallback((tip: number) => {
    setState((s) => ({ ...s, tip: Math.max(0, tip) }))
  }, [])

  const setNotes = useCallback((notes: string) => {
    setState((s) => ({ ...s, notes }))
  }, [])

  const setAppliedPromoCode = useCallback((code: string | null) => {
    setState((s) => ({ ...s, appliedPromoCode: code }))
  }, [])

  return {
    state,
    totals,
    hydrated,
    addProduct,
    updateLine,
    incrementLine,
    removeLine,
    clear,
    setCustomer,
    setTable,
    setServiceMode,
    setCartDiscount,
    setTip,
    setNotes,
    setAppliedPromoCode,
  }
}

function sameModifiers(a: OrderItemModifier[], b: OrderItemModifier[]) {
  if (a.length !== b.length) return false
  const aIds = a.map((m) => m.id).sort().join(',')
  const bIds = b.map((m) => m.id).sort().join(',')
  return aIds === bIds
}
