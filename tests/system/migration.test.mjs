/**
 * System test — migration coverage.
 *
 * Verifies that every page mentioned in the migration checklist exists
 * on disk, every supporting API route is wired up, and that the legacy
 * /middle-admin pages are still present (we do not delete the old UI).
 *
 * Static-only — no DB, no network.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const tests = []
const test = (name, fn) => tests.push({ name, fn })
const run = async () => {
  let p = 0,
    f = 0
  for (const t of tests) {
    try {
      await t.fn()
      console.log(`  ✓ ${t.name}`)
      p++
    } catch (err) {
      console.error(`  ✗ ${t.name}\n    ${err.message}`)
      f++
    }
  }
  console.log(`\n${p} passed, ${f} failed`)
  if (f > 0) process.exit(1)
}

// New POS pages introduced during the migration. Each one must exist as
// a Next.js route entry AND have a corresponding component file.
const NEW_POS_PAGES = [
  { route: 'src/app/pos/finance/page.tsx', component: 'src/components/pos/finance/FinancePage.tsx' },
  { route: 'src/app/pos/warehouse/page.tsx', component: 'src/components/pos/warehouse/WarehousePage.tsx' },
  { route: 'src/app/pos/clients/page.tsx', component: 'src/components/pos/clients/ClientsPage.tsx' },
  { route: 'src/app/pos/couriers/page.tsx', component: 'src/components/pos/couriers/CouriersPage.tsx' },
  { route: 'src/app/pos/chat/page.tsx', component: 'src/components/pos/chat/ChatPage.tsx' },
  { route: 'src/app/pos/delivery/map/page.tsx', component: 'src/components/pos/delivery/DeliveryMapPage.tsx' },
  { route: 'src/app/pos/trash/page.tsx', component: 'src/components/pos/trash/TrashPage.tsx' },
  { route: 'src/app/pos/sites/page.tsx', component: 'src/components/pos/sites/SitesPage.tsx' },
]

// Legacy pages that MUST stay alive (the migration keeps them as siblings).
const LEGACY_PAGES = [
  'src/app/middle-admin/page.tsx',
  'src/app/middle-admin/database/page.tsx',
  'src/components/admin/AdminDashboardPage.tsx',
  'src/components/admin/FinanceTab.tsx',
  'src/components/admin/WarehouseTab.tsx',
  'src/components/admin/InterfaceSettings.tsx',
]

// Required API endpoints reused by the new POS pages.
const REUSED_API = [
  'src/app/api/admin/finance/company/route.ts',
  'src/app/api/admin/finance/clients/route.ts',
  'src/app/api/admin/finance/transaction/route.ts',
  'src/app/api/admin/finance/buy-ingredients/route.ts',
  'src/app/api/admin/warehouse/ingredients/route.ts',
  'src/app/api/admin/warehouse/cooking-plan/route.ts',
  'src/app/api/admin/clients/bin/route.ts',
  'src/app/api/admin/clients/restore/route.ts',
  'src/app/api/admin/clients/permanent-delete/route.ts',
  'src/app/api/admin/couriers/route.ts',
  'src/app/api/admin/low-admins/route.ts',
  'src/app/api/admin/low-admins/[id]/route.ts',
  'src/app/api/orders/route.ts',
  'src/app/api/admin/sites/route.ts',
  'src/app/api/admin/sites/[id]/route.ts',
]

test('every new POS page has both route + component file', () => {
  for (const { route, component } of NEW_POS_PAGES) {
    assert.ok(existsSync(route), `missing route ${route}`)
    assert.ok(existsSync(component), `missing component ${component}`)
  }
})

test('legacy admin pages are still present (no redirects, no deletions)', () => {
  for (const f of LEGACY_PAGES) {
    assert.ok(existsSync(f), `legacy file disappeared: ${f}`)
  }
})

test('every reused API route exists', () => {
  for (const f of REUSED_API) {
    assert.ok(existsSync(f), `missing API route ${f}`)
  }
})

test('new POS pages are client components', () => {
  for (const { component } of NEW_POS_PAGES) {
    const src = readFileSync(component, 'utf8')
    assert.match(src, /^['"]use client['"]/m, `${component} missing 'use client'`)
  }
})

test('new POS pages do not silently redirect to legacy admin', () => {
  for (const { component } of NEW_POS_PAGES) {
    const src = readFileSync(component, 'utf8')
    // Hard redirects via Next router.replace('/middle-admin' …) would
    // violate the "preserve old UI, no redirects" migration principle.
    assert.doesNotMatch(
      src,
      /\.replace\(['"`]\/middle-admin/,
      `${component} hard-redirects to legacy admin`
    )
    assert.doesNotMatch(
      src,
      /\.push\(['"`]\/middle-admin/,
      `${component} pushes user to legacy admin`
    )
  }
})

test('nav structure references each new POS page', () => {
  const nav = readFileSync('src/lib/nav/structure.ts', 'utf8')
  const expectedHrefs = [
    '/pos/finance',
    '/pos/warehouse',
    '/pos/clients',
    '/pos/couriers',
    '/pos/chat',
    '/pos/delivery/map',
    '/pos/trash',
    '/pos/sites',
  ]
  for (const href of expectedHrefs) {
    assert.ok(nav.includes(`'${href}'`), `nav missing href ${href}`)
  }
})

test('nav contains zero legacy /middle-admin links', () => {
  // User requirement: the new left-rail must never expose legacy admin
  // pages. Legacy pages still exist in /middle-admin (no redirects, no
  // deletions per the migration test above) but they are accessed only
  // by direct URL — NOT through the unified nav.
  const nav = readFileSync('src/lib/nav/structure.ts', 'utf8')
  // Strip JS comments before scanning so doc-block references don't trip
  // the assertion.
  const code = nav
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  const legacyMatches = code.match(/\/middle-admin/g) ?? []
  assert.strictEqual(
    legacyMatches.length,
    0,
    `nav still has ${legacyMatches.length} legacy /middle-admin link(s) ` +
      `in code (comments are ignored); they must be removed from the unified left-rail.`
  )
})

test('UnifiedShell wraps useSearchParams consumers in <Suspense>', () => {
  const src = readFileSync('src/components/layout/UnifiedShell.tsx', 'utf8')
  assert.match(src, /<Suspense/, 'UnifiedShell missing <Suspense> wrappers')
  assert.match(src, /UnifiedSidebar/, 'UnifiedShell does not render UnifiedSidebar')
  assert.match(src, /UnifiedTopBar/, 'UnifiedShell does not render UnifiedTopBar')
})

test('middle-admin pages are force-dynamic to avoid prerender CSR bailout', () => {
  for (const f of [
    'src/app/middle-admin/page.tsx',
    'src/app/middle-admin/database/page.tsx',
  ]) {
    const src = readFileSync(f, 'utf8')
    assert.match(src, /dynamic\s*=\s*['"]force-dynamic['"]/, `${f} not force-dynamic`)
  }
})

test('escpos.ts no longer imports node:net at module top (server-only is split)', () => {
  const escpos = readFileSync('src/lib/pos/escpos.ts', 'utf8')
  assert.doesNotMatch(
    escpos,
    /^\s*import\s+[^/]*\s+from\s+['"]node:net['"]/m,
    'escpos.ts imports node:net at top level (must be in escpos-server.ts)'
  )
  // The server-only split must exist.
  assert.ok(
    existsSync('src/lib/pos/escpos-server.ts'),
    'escpos-server.ts missing (split for webpack node:net handling)'
  )
})

console.log(`Running migration coverage system tests…`)
await run()
