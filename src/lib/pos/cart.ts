/**
 * Cart math — pure functions, framework-agnostic.
 * All amounts are in the smallest user-facing currency unit (UZS).
 * No fractional sums are persisted; UI rounds for display.
 */
import type { CartLine, CartTotals, OrderItemModifier } from './types'

export function lineModifiersTotal(line: CartLine): number {
  return (line.modifiers ?? []).reduce((s, m) => s + (m.priceDelta || 0), 0)
}

export function lineUnitPriceWithModifiers(line: CartLine): number {
  return (line.unitPrice || 0) + lineModifiersTotal(line)
}

export function lineSubtotal(line: CartLine): number {
  return lineUnitPriceWithModifiers(line) * (line.quantity || 0)
}

export function lineNetAfterDiscount(line: CartLine): number {
  return Math.max(0, lineSubtotal(line) - (line.discount || 0))
}

export function lineTax(line: CartLine): number {
  return lineNetAfterDiscount(line) * (line.taxRate || 0)
}

export function lineTotalWithTax(line: CartLine): number {
  return lineNetAfterDiscount(line) + lineTax(line)
}

export type CartTotalsOptions = {
  /** Cart-level discount in absolute UZS or as a percent fraction. */
  cartDiscount?: number
  cartDiscountIsPercent?: boolean
  /** Optional service charge as a percent fraction (0.10 = 10%). */
  serviceChargeRate?: number
  /** Tip in absolute UZS. */
  tip?: number
}

export function computeCartTotals(
  lines: CartLine[],
  opts: CartTotalsOptions = {}
): CartTotals {
  const subtotal = lines.reduce((s, l) => s + lineSubtotal(l), 0)
  const lineDiscounts = lines.reduce((s, l) => s + (l.discount || 0), 0)

  const cartDiscountAbs = opts.cartDiscountIsPercent
    ? subtotal * (opts.cartDiscount || 0)
    : opts.cartDiscount || 0

  const discountTotal = lineDiscounts + cartDiscountAbs

  const netSubtotal = Math.max(0, subtotal - discountTotal)
  const serviceCharge = netSubtotal * (opts.serviceChargeRate || 0)

  const taxTotal = lines.reduce(
    (s, l) =>
      s +
      Math.max(0, lineSubtotal(l) - (l.discount || 0)) * (l.taxRate || 0),
    0
  )

  const tipTotal = opts.tip || 0
  const grandTotal = Math.max(
    0,
    netSubtotal + serviceCharge + taxTotal + tipTotal
  )
  const itemsCount = lines.reduce((s, l) => s + (l.quantity || 0), 0)

  return {
    subtotal: round(subtotal),
    discountTotal: round(discountTotal + serviceCharge * -0), // service charge folded into total
    taxTotal: round(taxTotal),
    tipTotal: round(tipTotal),
    grandTotal: round(grandTotal),
    itemsCount,
  }
}

export function round(n: number): number {
  // UZS has no minor units in practice; round to whole number.
  return Math.round(n)
}

export function makeCartLineId(): string {
  // Crypto-safe random where available, else fallback.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID()
  }
  return `line_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function applyModifiers(
  line: CartLine,
  mods: OrderItemModifier[]
): CartLine {
  return { ...line, modifiers: [...(line.modifiers || []), ...mods] }
}

export function setQuantity(line: CartLine, qty: number): CartLine {
  return { ...line, quantity: Math.max(0, Math.floor(qty)) }
}
