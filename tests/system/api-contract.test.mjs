/**
 * System test — API contract.
 *
 * For every src/app/api/pos/.../route.ts file, this test verifies:
 *   • exports at least one HTTP method (GET/POST/PATCH/DELETE)
 *   • imports requirePosAuth or has a documented auth-skip annotation
 *   • does not leak `console.log` (use a logger)
 *
 * Static analysis only — no DB, no network.
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...walk(p))
    else if (entry === 'route.ts') out.push(p)
  }
  return out
}

const routes = walk('src/app/api/pos')

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

test('discovered POS API route files', () => {
  assert.ok(routes.length > 20, `found only ${routes.length} routes`)
})

test('every route exports at least one HTTP handler', () => {
  for (const r of routes) {
    const src = readFileSync(r, 'utf8')
    const hasMethod = /\bexport\s+async\s+function\s+(GET|POST|PATCH|PUT|DELETE)\b/.test(src)
    assert.ok(hasMethod, `${r} missing HTTP handler`)
  }
})

test('every route uses requirePosAuth or is publicly documented', () => {
  for (const r of routes) {
    const src = readFileSync(r, 'utf8')
    const hasAuth = src.includes('requirePosAuth')
    const hasPublicMarker = src.includes('@public') || /\/\/\s*public-route/i.test(src)
    assert.ok(hasAuth || hasPublicMarker, `${r} has no auth check`)
  }
})

test('no console.log statements in production routes', () => {
  for (const r of routes) {
    const src = readFileSync(r, 'utf8')
    // console.error is OK for capturing failures; only ban console.log.
    const matches = src.match(/^\s*console\.log\b/gm)
    assert.ok(!matches || matches.length === 0, `${r} contains console.log`)
  }
})

test('every route imports NextResponse', () => {
  for (const r of routes) {
    const src = readFileSync(r, 'utf8')
    assert.ok(/NextResponse/.test(src), `${r} doesn't use NextResponse`)
  }
})

test('every POST/PATCH route validates body with zod or returns badRequest', () => {
  for (const r of routes) {
    const src = readFileSync(r, 'utf8')
    if (!/export async function (POST|PATCH|PUT)\b/.test(src)) continue
    const usesZod = /\b(z\.|zod)\b/.test(src) || /safeParse/.test(src)
    const usesBadRequest = /badRequest\(/.test(src)
    assert.ok(
      usesZod || usesBadRequest || /readonly/.test(src),
      `${r} mutates without zod validation`
    )
  }
})

console.log(`Running API contract system tests on ${routes.length} routes…`)
await run()
