#!/usr/bin/env node
/**
 * Master system test runner.
 *
 * Executes every test module under tests/system/*.test.mjs sequentially
 * and aggregates the pass/fail counts. Each test module exits non-zero
 * on failure, which we surface up so CI can fail the job cleanly.
 */
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(here)
  .filter((f) => f.endsWith('.test.mjs'))
  .map((f) => join(here, f))

console.log(`\n══ Debdi System Test Suite — ${files.length} module(s) ══\n`)
let failed = 0
const t0 = Date.now()
for (const file of files) {
  const name = file.split('/').pop()
  console.log(`▶ ${name}`)
  const r = spawnSync(process.execPath, [file], { stdio: 'inherit' })
  if (r.status !== 0) failed++
  console.log()
}
const ms = Date.now() - t0
console.log(`══ Done in ${ms}ms — ${files.length - failed}/${files.length} module(s) passed ══`)
process.exit(failed > 0 ? 1 : 0)
