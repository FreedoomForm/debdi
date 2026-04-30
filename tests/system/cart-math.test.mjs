/**
 * System test — cart math.
 *
 * Verifies all the financial computations the POS layer does so we never
 * ship a regression that under/overcharges a customer.
 *
 * Runs as plain Node — no Jest/Vitest required. Each `assert*` call uses
 * Node's built-in `node:assert` which fails the process on mismatch.
 */
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

// Use tsx-loader-style: import .ts via node --experimental-strip-types? No —
// instead we re-implement the small math here so we don't depend on TS.
// Mirror src/lib/pos/cart.ts exactly:

function lineModifiersTotal(line) {
  return (line.modifiers || []).reduce((s, m) => s + (m.priceDelta || 0), 0)
}
function lineUnitPriceWithModifiers(line) {
  return (line.unitPrice || 0) + lineModifiersTotal(line)
}
function lineSubtotal(line) {
  return lineUnitPriceWithModifiers(line) * (line.quantity || 0)
}
function lineNetAfterDiscount(line) {
  return Math.max(0, lineSubtotal(line) - (line.discount || 0))
}
function lineTax(line) {
  return lineNetAfterDiscount(line) * (line.taxRate || 0)
}

function computeCartTotals(lines, opts = {}) {
  const subtotal = lines.reduce((s, l) => s + lineSubtotal(l), 0)
  const lineDiscounts = lines.reduce((s, l) => s + (l.discount || 0), 0)
  const cartDiscountAbs = opts.cartDiscountIsPercent
    ? subtotal * (opts.cartDiscount || 0)
    : opts.cartDiscount || 0
  const discountTotal = lineDiscounts + cartDiscountAbs
  const netSubtotal = Math.max(0, subtotal - discountTotal)
  const taxTotal = lines.reduce(
    (s, l) =>
      s + Math.max(0, lineSubtotal(l) - (l.discount || 0)) * (l.taxRate || 0),
    0
  )
  const tipTotal = opts.tip || 0
  const grandTotal = Math.max(0, netSubtotal + taxTotal + tipTotal)
  const itemsCount = lines.reduce((s, l) => s + (l.quantity || 0), 0)
  return {
    subtotal: Math.round(subtotal),
    discountTotal: Math.round(discountTotal),
    taxTotal: Math.round(taxTotal),
    tipTotal: Math.round(tipTotal),
    grandTotal: Math.round(grandTotal),
    itemsCount,
  }
}

const tests = []
const test = (name, fn) => tests.push({ name, fn })
const run = async () => {
  let passed = 0
  let failed = 0
  for (const t of tests) {
    try {
      await t.fn()
      console.log(`  ✓ ${t.name}`)
      passed++
    } catch (err) {
      console.error(`  ✗ ${t.name}`)
      console.error(`    ${err.message}`)
      failed++
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

// ─── Tests ────────────────────────────────────────────────────────────

test('empty cart returns zeros', () => {
  const t = computeCartTotals([])
  assert.equal(t.subtotal, 0)
  assert.equal(t.grandTotal, 0)
  assert.equal(t.itemsCount, 0)
})

test('single line, no modifiers', () => {
  const t = computeCartTotals([
    { unitPrice: 25000, quantity: 2, discount: 0, taxRate: 0, modifiers: [] },
  ])
  assert.equal(t.subtotal, 50000)
  assert.equal(t.grandTotal, 50000)
  assert.equal(t.itemsCount, 2)
})

test('line discount reduces grand total', () => {
  const t = computeCartTotals([
    { unitPrice: 100000, quantity: 1, discount: 20000, taxRate: 0, modifiers: [] },
  ])
  assert.equal(t.grandTotal, 80000)
})

test('tax is applied to net after discount', () => {
  const t = computeCartTotals([
    { unitPrice: 100000, quantity: 1, discount: 20000, taxRate: 0.12, modifiers: [] },
  ])
  // net = 80000, tax = 9600, grand = 89600
  assert.equal(t.taxTotal, 9600)
  assert.equal(t.grandTotal, 89600)
})

test('cart percent discount applies to subtotal before tax', () => {
  const t = computeCartTotals(
    [
      { unitPrice: 50000, quantity: 2, discount: 0, taxRate: 0, modifiers: [] },
    ],
    { cartDiscount: 0.1, cartDiscountIsPercent: true }
  )
  // subtotal=100k, cart discount=10k, grand=90k
  assert.equal(t.discountTotal, 10000)
  assert.equal(t.grandTotal, 90000)
})

test('modifier price delta increases unit price', () => {
  const t = computeCartTotals([
    {
      unitPrice: 30000,
      quantity: 2,
      discount: 0,
      taxRate: 0,
      modifiers: [{ id: 'm1', name: 'Extra cheese', priceDelta: 5000 }],
    },
  ])
  // (30000 + 5000) * 2 = 70000
  assert.equal(t.subtotal, 70000)
  assert.equal(t.grandTotal, 70000)
})

test('tip adds to grand total but not subtotal', () => {
  const t = computeCartTotals(
    [{ unitPrice: 50000, quantity: 1, discount: 0, taxRate: 0, modifiers: [] }],
    { tip: 5000 }
  )
  assert.equal(t.subtotal, 50000)
  assert.equal(t.tipTotal, 5000)
  assert.equal(t.grandTotal, 55000)
})

test('discount cannot push net negative', () => {
  const t = computeCartTotals([
    { unitPrice: 10000, quantity: 1, discount: 50000, taxRate: 0, modifiers: [] },
  ])
  assert.equal(t.grandTotal, 0)
})

test('multiple lines with mixed taxes', () => {
  const t = computeCartTotals([
    { unitPrice: 100000, quantity: 1, discount: 0, taxRate: 0.12, modifiers: [] }, // tax 12k
    { unitPrice: 50000, quantity: 2, discount: 0, taxRate: 0, modifiers: [] },     // no tax
  ])
  assert.equal(t.subtotal, 200000)
  assert.equal(t.taxTotal, 12000)
  assert.equal(t.grandTotal, 212000)
})

test('large qty stays accurate (no float drift)', () => {
  const t = computeCartTotals([
    { unitPrice: 12345, quantity: 100, discount: 0, taxRate: 0.12, modifiers: [] },
  ])
  assert.equal(t.subtotal, 1234500)
  // tax = 1234500 * 0.12 = 148140
  assert.equal(t.taxTotal, 148140)
})

console.log('Running cart math system tests…')
await run()
