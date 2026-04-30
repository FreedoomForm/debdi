/**
 * System test — barcode validation.
 * Covers EAN-13 / EAN-8 checksum, format detection, and check-digit
 * generator. These functions guard the POS scan/lookup flow.
 */
import assert from 'node:assert/strict'

function isEan13Valid(code) {
  if (!/^\d{13}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const checksum = digits.pop()
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  }
  return ((10 - (sum % 10)) % 10) === checksum
}

function isEan8Valid(code) {
  if (!/^\d{8}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const checksum = digits.pop()
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1)
  }
  return ((10 - (sum % 10)) % 10) === checksum
}

function generateEan13(prefix12) {
  if (!/^\d{12}$/.test(prefix12)) throw new Error('prefix must be 12 digits')
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(prefix12[i]) * (i % 2 === 0 ? 1 : 3)
  return prefix12 + String((10 - (sum % 10)) % 10)
}

function detectFormat(code) {
  if (!code) return 'unknown'
  if (/^\d{13}$/.test(code) && isEan13Valid(code)) return 'EAN-13'
  if (/^\d{8}$/.test(code) && isEan8Valid(code)) return 'EAN-8'
  if (/^\d{12}$/.test(code)) return 'UPC-A'
  if (/^[A-Z0-9\-. $\/+%]+$/.test(code)) return 'CODE39'
  if (code.length > 30) return 'QR'
  return 'CODE128'
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

test('valid EAN-13 passes', () => {
  // 5901234123457 is a known valid EAN-13
  assert.equal(isEan13Valid('5901234123457'), true)
})

test('invalid EAN-13 with bad checksum fails', () => {
  assert.equal(isEan13Valid('5901234123458'), false)
})

test('non-digit EAN-13 rejected', () => {
  assert.equal(isEan13Valid('59012abc23457'), false)
})

test('valid EAN-8 passes', () => {
  // 96385074 is a known valid EAN-8
  assert.equal(isEan8Valid('96385074'), true)
})

test('invalid EAN-8 fails', () => {
  assert.equal(isEan8Valid('12345678'), false)
})

test('generateEan13 produces self-consistent code', () => {
  const code = generateEan13('590123412345')
  assert.equal(code.length, 13)
  assert.equal(isEan13Valid(code), true)
})

test('generateEan13 throws on bad prefix', () => {
  assert.throws(() => generateEan13('123'))
})

test('detectFormat finds EAN-13', () => {
  assert.equal(detectFormat('5901234123457'), 'EAN-13')
})

test('detectFormat falls back to CODE128 for short mixed-case input', () => {
  assert.equal(detectFormat('Abc123xyz'), 'CODE128')
})

test('detectFormat returns QR for very long strings', () => {
  const long = 'https://debdi.uz/r/' + 'A'.repeat(50)
  assert.equal(detectFormat(long), 'QR')
})

console.log('Running barcode validation system tests…')
await run()
