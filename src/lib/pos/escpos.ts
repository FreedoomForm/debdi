/**
 * ESC/POS receipt builder.
 *
 * Builds binary command buffers for thermal receipt printers (Epson TM-T20,
 * Star TSP100, Xprinter, etc.). Compatible with both 80mm and 58mm paper.
 *
 * The output `Uint8Array` can be:
 *   • POSTed to a network printer at <IP>:9100
 *   • Sent over Web Bluetooth to a Bluetooth thermal printer
 *   • Forwarded to a mobile companion app via WebSocket
 *   • Saved as a `.bin` file for testing
 *
 * For visual previews & PDF generation, use `renderReceiptHtml()` instead.
 */

import type { ReceiptPayload } from './types'

const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

const ALIGN_LEFT = 0
const ALIGN_CENTER = 1
const ALIGN_RIGHT = 2

/** Convert a string to bytes using CP866 fallback (works for Cyrillic). */
function strBytes(s: string): Uint8Array {
  // Use UTF-8; modern thermal printers + driver settings usually accept it.
  return new TextEncoder().encode(s)
}

class EscPosBuilder {
  private chunks: number[] = []

  push(...bytes: number[]): this {
    for (const b of bytes) this.chunks.push(b & 0xff)
    return this
  }

  pushStr(s: string): this {
    for (const b of strBytes(s)) this.chunks.push(b)
    return this
  }

  init(): this {
    return this.push(ESC, 0x40)
  }

  align(mode: 0 | 1 | 2): this {
    return this.push(ESC, 0x61, mode)
  }

  bold(on: boolean): this {
    return this.push(ESC, 0x45, on ? 1 : 0)
  }

  underline(on: boolean): this {
    return this.push(ESC, 0x2d, on ? 1 : 0)
  }

  doubleSize(on: boolean): this {
    // GS ! n — bit0..3 = width, bit4..7 = height. 0x11 = 2x w & h
    return this.push(GS, 0x21, on ? 0x11 : 0x00)
  }

  feed(lines = 1): this {
    for (let i = 0; i < lines; i++) this.chunks.push(LF)
    return this
  }

  /** Cut paper. */
  cut(partial = true): this {
    return this.push(GS, 0x56, partial ? 0x01 : 0x00)
  }

  /** Open the cash drawer pulse. */
  drawerKick(): this {
    // ESC p m t1 t2  — m=0 (pin 2), t1=t2=120ms
    return this.push(ESC, 0x70, 0x00, 0x78, 0x78)
  }

  /** Print barcode (CODE128) — useful for receipt lookup / loyalty. */
  barcode(data: string): this {
    // GS h n  — height
    this.push(GS, 0x68, 100)
    // GS w n — width
    this.push(GS, 0x77, 0x02)
    // GS H n — HRI position below
    this.push(GS, 0x48, 0x02)
    // GS k m … m=73 (CODE128), data length, data
    const bytes = strBytes(data)
    this.push(GS, 0x6b, 73, bytes.length)
    for (const b of bytes) this.chunks.push(b)
    return this
  }

  /** Print QR code — used for digital receipt URL or loyalty link. */
  qr(data: string, size: number = 6): this {
    // Model
    this.push(GS, 0x28, 0x6b, 4, 0, 49, 65, 50, 0)
    // Size
    this.push(GS, 0x28, 0x6b, 3, 0, 49, 67, size & 0xff)
    // Error correction (M)
    this.push(GS, 0x28, 0x6b, 3, 0, 49, 69, 49)
    // Store data
    const bytes = strBytes(data)
    const len = bytes.length + 3
    this.push(GS, 0x28, 0x6b, len & 0xff, (len >> 8) & 0xff, 49, 80, 48)
    for (const b of bytes) this.chunks.push(b)
    // Print
    return this.push(GS, 0x28, 0x6b, 3, 0, 49, 81, 48)
  }

  toBuffer(): Uint8Array {
    return new Uint8Array(this.chunks)
  }
}

/**
 * Lay out a 2-column receipt row that fits within `width` characters.
 * Pads the right column right-aligned.
 */
function row(left: string, right: string, width: number): string {
  const leftSafe = left || ''
  const rightSafe = right || ''
  const remaining = Math.max(1, width - rightSafe.length)
  const truncatedLeft = leftSafe.length > remaining
    ? leftSafe.slice(0, remaining - 1) + '…'
    : leftSafe
  return truncatedLeft.padEnd(remaining, ' ') + rightSafe
}

const CURRENCY_LABEL: Record<string, string> = {
  UZS: 'сум',
  USD: '$',
  EUR: '€',
  RUB: 'руб',
  KZT: '₸',
  TJS: 'TJS',
}

function fmtAmount(n: number, currency: string): string {
  const label = CURRENCY_LABEL[currency] ?? currency
  const num = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: currency === 'UZS' || currency === 'KZT' ? 0 : 2,
  }).format(n || 0)
  return `${num} ${label}`
}

export function buildReceipt(
  payload: ReceiptPayload,
  paperWidth: '80mm' | '58mm' = '80mm'
): Uint8Array {
  const cols = paperWidth === '80mm' ? 42 : 32
  const b = new EscPosBuilder()

  b.init()

  // Header
  b.align(ALIGN_CENTER).doubleSize(true).bold(true)
  b.pushStr(payload.storeName).feed(1)
  b.doubleSize(false)
  if (payload.storeAddress) b.pushStr(payload.storeAddress).feed(1)
  if (payload.storePhone) b.pushStr(payload.storePhone).feed(1)
  b.bold(false)

  b.feed(1)
  b.align(ALIGN_LEFT)
  b.pushStr('-'.repeat(cols)).feed(1)
  b.pushStr(row(`Заказ #${payload.orderNumber}`, payload.printedAt, cols)).feed(1)
  if (payload.cashierName) b.pushStr(`Кассир: ${payload.cashierName}`).feed(1)
  if (payload.customerName) b.pushStr(`Клиент: ${payload.customerName}`).feed(1)
  b.pushStr('-'.repeat(cols)).feed(1)

  // Items
  for (const item of payload.items) {
    const name =
      item.quantity > 1
        ? `${item.quantity} × ${item.name}`
        : item.name
    b.bold(true).pushStr(name).feed(1).bold(false)
    b.pushStr(
      row(
        `  ${fmtAmount(item.unitPrice, payload.currency)}`,
        fmtAmount(item.total, payload.currency),
        cols
      )
    ).feed(1)
    if (item.modifiers && item.modifiers.length) {
      for (const m of item.modifiers) {
        const tag = m.priceDelta
          ? `  + ${m.name} (${fmtAmount(m.priceDelta, payload.currency)})`
          : `  + ${m.name}`
        b.pushStr(tag).feed(1)
      }
    }
    if (item.notes) b.pushStr(`  Прим.: ${item.notes}`).feed(1)
  }

  b.pushStr('-'.repeat(cols)).feed(1)

  // Totals
  b.pushStr(
    row('Подытог', fmtAmount(payload.subtotal, payload.currency), cols)
  ).feed(1)
  if (payload.discountTotal > 0) {
    b.pushStr(
      row('Скидка', `-${fmtAmount(payload.discountTotal, payload.currency)}`, cols)
    ).feed(1)
  }
  if (payload.taxTotal > 0) {
    b.pushStr(
      row('Налог', fmtAmount(payload.taxTotal, payload.currency), cols)
    ).feed(1)
  }
  if (payload.tipTotal > 0) {
    b.pushStr(
      row('Чаевые', fmtAmount(payload.tipTotal, payload.currency), cols)
    ).feed(1)
  }

  b.bold(true).doubleSize(true)
  b.pushStr(
    row('ИТОГО', fmtAmount(payload.grandTotal, payload.currency), cols)
  ).feed(1)
  b.doubleSize(false).bold(false)

  b.pushStr('-'.repeat(cols)).feed(1)

  // Payments
  for (const p of payload.payments) {
    const label =
      p.method === 'CASH'
        ? 'Наличные'
        : p.method === 'CARD'
        ? 'Карта'
        : p.method === 'TRANSFER'
        ? 'Перевод'
        : p.method
    b.pushStr(row(label, fmtAmount(p.amount, payload.currency), cols)).feed(1)
    if (p.reference) b.pushStr(`  ${p.reference}`).feed(1)
  }
  if (payload.changeGiven && payload.changeGiven > 0) {
    b.pushStr(
      row('Сдача', fmtAmount(payload.changeGiven, payload.currency), cols)
    ).feed(1)
  }

  // Loyalty
  if (typeof payload.loyaltyEarned === 'number' && payload.loyaltyEarned > 0) {
    b.feed(1)
    b.pushStr('-'.repeat(cols)).feed(1)
    b.pushStr(`Начислено баллов: ${payload.loyaltyEarned}`).feed(1)
    if (typeof payload.loyaltyBalance === 'number') {
      b.pushStr(`Баланс баллов: ${payload.loyaltyBalance}`).feed(1)
    }
  }

  // QR for digital receipt lookup
  b.feed(1)
  b.align(ALIGN_CENTER)
  b.qr(`receipt:${payload.receiptNumber}`, paperWidth === '80mm' ? 6 : 5)
  b.feed(1)
  b.pushStr(`#${payload.receiptNumber}`).feed(1)

  if (payload.footerNote) {
    b.feed(1)
    b.pushStr(payload.footerNote).feed(1)
  }

  b.feed(2)
  b.cut(true)

  return b.toBuffer()
}

/** Builds a kitchen ticket — bigger fonts, no totals, just items+notes. */
export function buildKitchenTicket(
  orderNumber: number | string,
  items: Array<{ name: string; quantity: number; modifiers?: { name: string }[]; notes?: string | null }>,
  paperWidth: '80mm' | '58mm' = '80mm',
  station?: string
): Uint8Array {
  const cols = paperWidth === '80mm' ? 42 : 32
  const b = new EscPosBuilder()
  b.init()
  b.align(ALIGN_CENTER).doubleSize(true).bold(true)
  b.pushStr(`*** ${station ?? 'КУХНЯ'} ***`).feed(1)
  b.pushStr(`Заказ #${orderNumber}`).feed(1)
  b.doubleSize(false).bold(false).align(ALIGN_LEFT)
  b.pushStr(new Date().toLocaleTimeString('ru-RU')).feed(1)
  b.pushStr('='.repeat(cols)).feed(1)

  for (const it of items) {
    b.doubleSize(true).bold(true)
    b.pushStr(`${it.quantity} × ${it.name}`).feed(1)
    b.doubleSize(false).bold(false)
    if (it.modifiers && it.modifiers.length) {
      for (const m of it.modifiers) {
        b.pushStr(`  + ${m.name}`).feed(1)
      }
    }
    if (it.notes) {
      b.bold(true).pushStr(`  ! ${it.notes}`).feed(1).bold(false)
    }
    b.feed(1)
  }

  b.feed(2)
  b.cut(true)
  return b.toBuffer()
}

/** Send raw ESC/POS bytes to a network printer at <ip>:<port>. */
export async function sendToNetworkPrinter(
  ip: string,
  port: number,
  data: Uint8Array
): Promise<{ ok: boolean; error?: string }> {
  // Server-side only — uses Node net socket. Wrapped in dynamic import so the
  // module stays compatible with browser bundlers.
  if (typeof window !== 'undefined') {
    return { ok: false, error: 'Network printing must run server-side' }
  }
  try {
    const net = await import('node:net')
    return await new Promise((resolve) => {
      const sock = new net.Socket()
      let settled = false
      const cleanup = (result: { ok: boolean; error?: string }) => {
        if (settled) return
        settled = true
        try {
          sock.destroy()
        } catch {
          /* ignore */
        }
        resolve(result)
      }
      sock.setTimeout(5000)
      sock.on('error', (err) => cleanup({ ok: false, error: err.message }))
      sock.on('timeout', () =>
        cleanup({ ok: false, error: 'Printer connection timeout' })
      )
      sock.connect(port, ip, () => {
        sock.write(Buffer.from(data), (err) => {
          if (err) {
            cleanup({ ok: false, error: err.message })
          } else {
            sock.end()
            cleanup({ ok: true })
          }
        })
      })
    })
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/** Render a receipt as printable HTML — used for browser preview, PDF export
 *  and for sending via "Print to default printer" (window.print). */
export function renderReceiptHtml(
  payload: ReceiptPayload,
  paperWidth: '80mm' | '58mm' = '80mm'
): string {
  const cols = paperWidth === '80mm' ? 42 : 32
  const widthMm = paperWidth === '80mm' ? 80 : 58
  const items = payload.items
    .map((it) => {
      const mods =
        it.modifiers && it.modifiers.length
          ? it.modifiers
              .map(
                (m) =>
                  `<div class="mod">+ ${escapeHtml(m.name)}${
                    m.priceDelta
                      ? ` (${fmtAmount(m.priceDelta, payload.currency)})`
                      : ''
                  }</div>`
              )
              .join('')
          : ''
      const notes = it.notes
        ? `<div class="mod">Прим.: ${escapeHtml(it.notes)}</div>`
        : ''
      return `
      <div class="line">
        <div class="line-name"><b>${it.quantity} × ${escapeHtml(
        it.name
      )}</b></div>
        <div class="line-price">
          <span>${fmtAmount(it.unitPrice, payload.currency)}</span>
          <span><b>${fmtAmount(it.total, payload.currency)}</b></span>
        </div>
        ${mods}${notes}
      </div>`
    })
    .join('')

  const payments = payload.payments
    .map(
      (p) => `<div class="row">
        <span>${
          p.method === 'CASH'
            ? 'Наличные'
            : p.method === 'CARD'
            ? 'Карта'
            : 'Перевод'
        }${p.reference ? ` · ${escapeHtml(p.reference)}` : ''}</span>
        <span>${fmtAmount(p.amount, payload.currency)}</span>
      </div>`
    )
    .join('')

  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>Чек ${payload.receiptNumber}</title>
<style>
  @page { size: ${widthMm}mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { width: ${widthMm}mm; margin: 0; padding: 4mm; font: 12px/1.35 'JetBrains Mono', 'Courier New', ui-monospace, monospace; color: #000; }
  .center { text-align: center; }
  .right { text-align: right; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .line { margin-bottom: 6px; }
  .line-price { display: flex; justify-content: space-between; }
  .mod { padding-left: 8px; color: #333; font-size: 11px; }
  .total { font-size: 14px; font-weight: 700; }
  .qr { margin: 8px auto; width: 60mm; }
  .qr img { width: 100%; }
  .small { font-size: 11px; }
</style></head>
<body>
  <div class="center">
    <h2 style="margin:0;font-size:14px">${escapeHtml(payload.storeName)}</h2>
    ${payload.storeAddress ? `<div class="small">${escapeHtml(payload.storeAddress)}</div>` : ''}
    ${payload.storePhone ? `<div class="small">${escapeHtml(payload.storePhone)}</div>` : ''}
  </div>
  <hr/>
  <div class="row"><span>Заказ #${payload.orderNumber}</span><span>${escapeHtml(payload.printedAt)}</span></div>
  ${payload.cashierName ? `<div class="small">Кассир: ${escapeHtml(payload.cashierName)}</div>` : ''}
  ${payload.customerName ? `<div class="small">Клиент: ${escapeHtml(payload.customerName)}</div>` : ''}
  <hr/>
  ${items}
  <hr/>
  <div class="row"><span>Подытог</span><span>${fmtAmount(payload.subtotal, payload.currency)}</span></div>
  ${payload.discountTotal > 0 ? `<div class="row"><span>Скидка</span><span>-${fmtAmount(payload.discountTotal, payload.currency)}</span></div>` : ''}
  ${payload.taxTotal > 0 ? `<div class="row"><span>Налог</span><span>${fmtAmount(payload.taxTotal, payload.currency)}</span></div>` : ''}
  ${payload.tipTotal > 0 ? `<div class="row"><span>Чаевые</span><span>${fmtAmount(payload.tipTotal, payload.currency)}</span></div>` : ''}
  <div class="row total"><span>ИТОГО</span><span>${fmtAmount(payload.grandTotal, payload.currency)}</span></div>
  <hr/>
  ${payments}
  ${payload.changeGiven && payload.changeGiven > 0 ? `<div class="row"><span>Сдача</span><span>${fmtAmount(payload.changeGiven, payload.currency)}</span></div>` : ''}
  ${
    typeof payload.loyaltyEarned === 'number' && payload.loyaltyEarned > 0
      ? `<hr/><div class="small">Начислено баллов: <b>${payload.loyaltyEarned}</b></div>${
          typeof payload.loyaltyBalance === 'number'
            ? `<div class="small">Баланс: <b>${payload.loyaltyBalance}</b></div>`
            : ''
        }`
      : ''
  }
  <div class="qr center">
    <img alt="QR" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('receipt:' + payload.receiptNumber)}" />
    <div class="small">#${escapeHtml(payload.receiptNumber)}</div>
  </div>
  ${payload.footerNote ? `<div class="center small">${escapeHtml(payload.footerNote)}</div>` : ''}
  <script>window.addEventListener('load', () => { setTimeout(() => window.print(), 80); });</script>
</body></html>`
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
