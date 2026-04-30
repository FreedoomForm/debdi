/**
 * Barcode scanner detection & validation.
 *
 * Most USB/Bluetooth barcode scanners act as keyboards — they "type" the
 * barcode followed by Enter. The scanner detector below distinguishes
 * fast scanner input (>~30 chars/s) from human typing.
 *
 * For mobile cameras, see `src/components/pos/CameraScanner.tsx` (uses
 * the BarcodeDetector API where available, with a ZXing-WASM fallback).
 */

export type BarcodeFormat =
  | 'EAN-13'
  | 'EAN-8'
  | 'UPC-A'
  | 'UPC-E'
  | 'CODE128'
  | 'CODE39'
  | 'QR'
  | 'unknown'

const SCAN_TIMEOUT_MS = 50 // gap between keystrokes that counts as "human"

export type ScannerOptions = {
  /** Min chars to count as a barcode. */
  minLength?: number
  /** Called whenever a complete scan is detected. */
  onScan: (code: string) => void
  /** Hook to filter out scans coming from focused input fields. */
  ignoreWhenInputFocused?: boolean
}

/** Attaches a global keypress listener that rapidly accumulates characters
 *  and fires `onScan` on Enter. Returns the cleanup function. */
export function attachScannerListener(opts: ScannerOptions): () => void {
  const minLength = opts.minLength ?? 6
  let buffer = ''
  let lastKeyTs = 0

  const handler = (e: KeyboardEvent) => {
    if (opts.ignoreWhenInputFocused) {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase()
      const editable = (e.target as HTMLElement | null)?.isContentEditable
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || editable) {
        return
      }
    }

    const now = Date.now()
    const isFastInput = now - lastKeyTs < SCAN_TIMEOUT_MS

    if (e.key === 'Enter') {
      if (buffer.length >= minLength) {
        opts.onScan(buffer)
        e.preventDefault()
      }
      buffer = ''
      lastKeyTs = 0
      return
    }

    if (e.key.length === 1) {
      if (!isFastInput) buffer = ''
      buffer += e.key
      lastKeyTs = now
    }
  }

  window.addEventListener('keydown', handler, { capture: true })
  return () => window.removeEventListener('keydown', handler, { capture: true } as any)
}

/* ────────────────────────────────────────────────────────────
   Validation helpers
   ──────────────────────────────────────────────────────────── */

export function detectBarcodeFormat(code: string): BarcodeFormat {
  if (!code) return 'unknown'
  if (/^\d{13}$/.test(code) && isEan13Valid(code)) return 'EAN-13'
  if (/^\d{8}$/.test(code) && isEan8Valid(code)) return 'EAN-8'
  if (/^\d{12}$/.test(code)) return 'UPC-A'
  if (/^\d{6,8}$/.test(code)) return 'UPC-E'
  if (/^[A-Z0-9\-. $\/+%]+$/.test(code)) return 'CODE39'
  if (code.length > 30) return 'QR'
  return 'CODE128'
}

export function isEan13Valid(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false
  const digits = code.split('').map((c) => Number(c))
  const checksum = digits.pop()!
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  }
  const calc = (10 - (sum % 10)) % 10
  return calc === checksum
}

export function isEan8Valid(code: string): boolean {
  if (!/^\d{8}$/.test(code)) return false
  const digits = code.split('').map((c) => Number(c))
  const checksum = digits.pop()!
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1)
  }
  const calc = (10 - (sum % 10)) % 10
  return calc === checksum
}

/** Generate a check digit and return a complete EAN-13 from a 12-digit prefix. */
export function generateEan13(prefix12: string): string {
  if (!/^\d{12}$/.test(prefix12)) throw new Error('prefix must be 12 digits')
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const d = Number(prefix12[i])
    sum += d * (i % 2 === 0 ? 1 : 3)
  }
  const checksum = (10 - (sum % 10)) % 10
  return prefix12 + String(checksum)
}
