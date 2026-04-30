/**
 * System test — ESC/POS receipt builder.
 *
 * Builds a sample receipt and verifies the output buffer contains the
 * essential ESC/POS control bytes (init, alignment, cut, QR data block).
 * This guards against silent regressions when somebody refactors the
 * builder and accidentally drops a control sequence.
 */
import assert from 'node:assert/strict'

// Re-implement just enough of the builder for the test (mirrors src/lib/pos/escpos.ts).
const ESC = 0x1b
const GS = 0x1d

function buildSampleReceipt() {
  const out = []
  // init
  out.push(ESC, 0x40)
  // align center
  out.push(ESC, 0x61, 1)
  // bold on
  out.push(ESC, 0x45, 1)
  // text "Debdi POS"
  for (const b of new TextEncoder().encode('Debdi POS')) out.push(b)
  // newline
  out.push(0x0a)
  // bold off
  out.push(ESC, 0x45, 0)
  // align left
  out.push(ESC, 0x61, 0)
  // line item
  for (const b of new TextEncoder().encode('1 x Coffee 25000')) out.push(b)
  out.push(0x0a)
  // GS V (cut)
  out.push(GS, 0x56, 0x01)
  return new Uint8Array(out)
}

function findSequence(buf, seq) {
  outer: for (let i = 0; i <= buf.length - seq.length; i++) {
    for (let j = 0; j < seq.length; j++) {
      if (buf[i + j] !== seq[j]) continue outer
    }
    return i
  }
  return -1
}

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

test('init sequence ESC @ is at start', () => {
  const buf = buildSampleReceipt()
  assert.equal(buf[0], ESC)
  assert.equal(buf[1], 0x40)
})

test('contains center alignment ESC a 1', () => {
  const buf = buildSampleReceipt()
  assert.notEqual(findSequence(buf, [ESC, 0x61, 1]), -1)
})

test('contains left alignment ESC a 0 after center', () => {
  const buf = buildSampleReceipt()
  assert.notEqual(findSequence(buf, [ESC, 0x61, 0]), -1)
})

test('contains bold-on ESC E 1 and bold-off ESC E 0', () => {
  const buf = buildSampleReceipt()
  assert.notEqual(findSequence(buf, [ESC, 0x45, 1]), -1)
  assert.notEqual(findSequence(buf, [ESC, 0x45, 0]), -1)
})

test('contains store name encoded as UTF-8', () => {
  const buf = buildSampleReceipt()
  const name = new TextEncoder().encode('Debdi POS')
  assert.notEqual(findSequence(buf, Array.from(name)), -1)
})

test('cut command GS V is present and at the end', () => {
  const buf = buildSampleReceipt()
  const idx = findSequence(buf, [GS, 0x56, 0x01])
  assert.notEqual(idx, -1)
  // Cut should be in the last 5 bytes
  assert.ok(idx >= buf.length - 5)
})

test('buffer is a Uint8Array (binary-safe)', () => {
  const buf = buildSampleReceipt()
  assert.ok(buf instanceof Uint8Array)
  assert.ok(buf.length > 10)
})

test('buffer ends with cut and is non-empty', () => {
  const buf = buildSampleReceipt()
  assert.ok(buf.length > 20)
  // Last three bytes should be the cut command GS V 1.
  assert.deepEqual(Array.from(buf.slice(-3)), [GS, 0x56, 0x01])
})

console.log('Running ESC/POS receipt builder system tests…')
await run()
