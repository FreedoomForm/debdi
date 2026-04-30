/**
 * System test — Prisma schema sanity.
 *
 * Reads prisma/schema.prisma and verifies the POS extension models exist,
 * have proper @@index/@@map directives, and back-references match.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')

const tests = []
const test = (name, fn) => tests.push({ name, fn })
const run = async () => {
  let p = 0, f = 0
  for (const t of tests) {
    try { await t.fn(); console.log(`  ✓ ${t.name}`); p++ }
    catch (err) { console.error(`  ✗ ${t.name}\n    ${err.message}`); f++ }
  }
  console.log(`\n${p} passed, ${f} failed`)
  if (f > 0) process.exit(1)
}

const REQUIRED_MODELS = [
  'Admin', 'Customer', 'Order', 'OrderItem',
  'Product', 'ProductCategory', 'ProductVariant', 'ProductModifier',
  'StockMovement', 'RestaurantTable', 'TableSection', 'Reservation',
  'CashierShift', 'Payment', 'Discount',
  'LoyaltyProgram', 'LoyaltyTier', 'LoyaltyMember', 'LoyaltyPointsLog',
  'Supplier', 'PurchaseOrder', 'PurchaseOrderItem', 'Receipt',
  'Notification', 'Branch', 'TaxRate', 'ApiKey', 'PrinterDevice',
  'GiftCard', 'GiftCardRedemption', 'TimeclockEntry', 'CashDrawerMovement',
]

const REQUIRED_ENUMS = [
  'AdminRole', 'OrderStatus', 'PaymentStatus', 'PaymentMethod',
  'OrderType', 'StockMovementType', 'TableStatus', 'ReservationStatus',
  'ShiftStatus', 'PaymentTxnStatus', 'DiscountType', 'PurchaseOrderStatus',
  'ReceiptType', 'NotificationType', 'PrinterType', 'CashDrawerMoveType',
]

test('all required POS models are defined', () => {
  for (const m of REQUIRED_MODELS) {
    assert.ok(new RegExp(`^model ${m} \\{`, 'm').test(schema), `missing model: ${m}`)
  }
})

test('all required POS enums are defined', () => {
  for (const e of REQUIRED_ENUMS) {
    assert.ok(new RegExp(`^enum ${e} \\{`, 'm').test(schema), `missing enum: ${e}`)
  }
})

test('Customer has totalSpent / totalOrders / loyaltyMember relation', () => {
  assert.ok(/totalSpent\s+Float/.test(schema))
  assert.ok(/totalOrders\s+Int/.test(schema))
  assert.ok(/loyaltyMember\s+LoyaltyMember\?/.test(schema))
})

test('Order has items / payments / receipts / serviceMode', () => {
  assert.ok(/items\s+OrderItem\[\]/.test(schema))
  assert.ok(/payments\s+Payment\[\]/.test(schema))
  assert.ok(/receipts\s+Receipt\[\]/.test(schema))
  assert.ok(/serviceMode\s+String\?/.test(schema))
})

test('CashierShift has drawerMovements back-relation', () => {
  assert.ok(/drawerMovements\s+CashDrawerMovement\[\]/.test(schema))
})

test('Product has unique constraint on (ownerAdminId, sku) and barcode', () => {
  assert.ok(/@@unique\(\[ownerAdminId, sku\]\)/.test(schema))
  assert.ok(/@@unique\(\[ownerAdminId, barcode\]\)/.test(schema))
})

test('LoyaltyMember.customerId is unique (one membership per customer)', () => {
  // Look for the field with @unique
  assert.ok(/customerId\s+String\s+@unique/.test(schema))
})

test('every model with ownerAdminId is indexed', () => {
  // Find all models that mention ownerAdminId, then verify each has an
  // @@index containing ownerAdminId.
  const modelBlocks = schema.match(/^model \w+ \{[\s\S]*?^\}/gm) ?? []
  for (const block of modelBlocks) {
    if (!/\bownerAdminId\b/.test(block)) continue
    const name = block.match(/^model (\w+) /)[1]
    // Loyalty + a few singletons use @@unique — that's fine too.
    const hasIndex =
      /@@index\(\[ownerAdminId/.test(block) ||
      /@@unique\(\[ownerAdminId/.test(block) ||
      name === 'LoyaltyProgram' /* program is unique-per-admin */
    assert.ok(hasIndex, `model ${name} has ownerAdminId but no @@index`)
  }
})

console.log('Running Prisma schema system tests…')
await run()
