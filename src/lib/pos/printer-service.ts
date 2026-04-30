/**
 * Printer service — abstracts the various ways a receipt/kitchen ticket
 * can be sent to a physical printer.
 *
 * Supported transports:
 *   • network (TCP raw socket on port 9100, server-side only)
 *   • bluetooth (Web Bluetooth API, browser-only)
 *   • usb (WebUSB API, browser-only)
 *   • mobile-bridge (POST to a companion mobile app on the local network)
 *   • browser-print (opens an HTML preview in a new window and triggers
 *     `window.print()` — works for any printer the OS knows about)
 *
 * Choose at call site based on `PrinterDevice.connection`.
 */

import {
  buildKitchenTicket,
  buildReceipt,
  renderReceiptHtml,
} from './escpos'
import type { PosPrinter, ReceiptPayload } from './types'

export type PrintResult = { ok: boolean; error?: string; method: string }

/** Print a customer receipt to the configured device. */
export async function printReceipt(
  printer: PosPrinter,
  payload: ReceiptPayload
): Promise<PrintResult> {
  if (!printer.isActive) {
    return { ok: false, error: 'Printer is disabled', method: 'noop' }
  }

  if (printer.connection === 'network' && printer.ipAddress) {
    const data = buildReceipt(payload, printer.paperWidth)
    const res = await networkPrint(printer.ipAddress, printer.port ?? 9100, data)
    return { ...res, method: 'network' }
  }

  if (printer.connection === 'bluetooth') {
    const bytes = buildReceipt(payload, printer.paperWidth)
    return await sendBluetooth(bytes, printer.bluetoothMac)
  }

  if (printer.connection === 'usb') {
    const bytes = buildReceipt(payload, printer.paperWidth)
    return await sendUsb(bytes)
  }

  // Browser fallback — opens an HTML preview window and prints via OS dialog.
  if (typeof window !== 'undefined') {
    const html = renderReceiptHtml(payload, printer.paperWidth)
    return openPrintWindow(html)
  }

  return { ok: false, error: 'No supported transport', method: 'unknown' }
}

/** Print a kitchen / bar ticket. */
export async function printKitchenTicket(
  printer: PosPrinter,
  orderNumber: number | string,
  items: Array<{
    name: string
    quantity: number
    modifiers?: { name: string }[]
    notes?: string | null
  }>,
  station?: string
): Promise<PrintResult> {
  if (!printer.isActive) {
    return { ok: false, error: 'Printer is disabled', method: 'noop' }
  }
  const data = buildKitchenTicket(
    orderNumber,
    items,
    printer.paperWidth,
    station
  )
  if (printer.connection === 'network' && printer.ipAddress) {
    const res = await networkPrint(printer.ipAddress, printer.port ?? 9100, data)
    return { ...res, method: 'network' }
  }
  if (printer.connection === 'bluetooth') {
    return sendBluetooth(data, printer.bluetoothMac)
  }
  if (printer.connection === 'usb') {
    return sendUsb(data)
  }
  return { ok: false, error: 'No supported transport', method: 'unknown' }
}

/* ────────────────────────────────────────────────────────────
   Web Bluetooth — pairs once per session, then writes raw ESC/POS.
   ──────────────────────────────────────────────────────────── */

const BT_PRINTER_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb'
const BT_PRINTER_CHAR = '00002af1-0000-1000-8000-00805f9b34fb'

declare global {
  // Subset of the Web Bluetooth types — Next.js's lib.dom doesn't include them.
  interface Navigator {
    bluetooth?: {
      requestDevice(opts: any): Promise<any>
    }
  }
}

async function sendBluetooth(
  bytes: Uint8Array,
  expectedMac?: string | null
): Promise<PrintResult> {
  if (typeof window === 'undefined' || !navigator.bluetooth) {
    return {
      ok: false,
      error:
        'Web Bluetooth недоступен в этом браузере. Используйте Chrome/Edge/Samsung Internet.',
      method: 'bluetooth',
    }
  }
  try {
    const filters = expectedMac
      ? [{ namePrefix: 'Printer' }, { namePrefix: 'POS' }, { namePrefix: 'BT' }]
      : [{ services: [BT_PRINTER_SERVICE] }, { namePrefix: 'Printer' }]
    const device = await navigator.bluetooth.requestDevice({
      filters,
      optionalServices: [BT_PRINTER_SERVICE],
    })
    const server = await device.gatt.connect()
    const service = await server.getPrimaryService(BT_PRINTER_SERVICE)
    const ch = await service.getCharacteristic(BT_PRINTER_CHAR)
    // Write in chunks of 200 bytes (BLE limit).
    const CHUNK = 200
    for (let i = 0; i < bytes.length; i += CHUNK) {
      await ch.writeValue(bytes.slice(i, i + CHUNK))
    }
    await server.disconnect()
    return { ok: true, method: 'bluetooth' }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      method: 'bluetooth',
    }
  }
}

/* ────────────────────────────────────────────────────────────
   WebUSB — useful for Chromebook / desktop POS terminals
   that connect printers over USB.
   ──────────────────────────────────────────────────────────── */

async function sendUsb(bytes: Uint8Array): Promise<PrintResult> {
  if (typeof window === 'undefined' || !(navigator as any).usb) {
    return {
      ok: false,
      error: 'WebUSB недоступен в этом браузере',
      method: 'usb',
    }
  }
  try {
    const device = await (navigator as any).usb.requestDevice({
      filters: [
        { vendorId: 0x04b8 }, // Epson
        { vendorId: 0x0519 }, // Star
        { vendorId: 0x1659 }, // Xprinter
        { vendorId: 0x0fe6 }, // Generic
      ],
    })
    await device.open()
    if (device.configuration === null) await device.selectConfiguration(1)
    await device.claimInterface(0)
    // Find OUT endpoint
    const intf = device.configuration.interfaces[0]
    const alt = intf.alternates[0]
    const epOut = alt.endpoints.find((e: any) => e.direction === 'out')
    if (!epOut) throw new Error('No OUT endpoint on USB device')
    await device.transferOut(epOut.endpointNumber, bytes)
    await device.close()
    return { ok: true, method: 'usb' }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      method: 'usb',
    }
  }
}

/* ────────────────────────────────────────────────────────────
   Browser print — opens a 80mm HTML page and triggers OS print.
   Works with any printer the OS already knows (incl. AirPrint,
   network IPP, USB drivers, virtual PDF).
   ──────────────────────────────────────────────────────────── */

function openPrintWindow(html: string): PrintResult {
  try {
    const win = window.open('', '_blank', 'width=420,height=720')
    if (!win) {
      return {
        ok: false,
        error: 'Окно блокировано — разрешите всплывающие окна',
        method: 'browser-print',
      }
    }
    win.document.write(html)
    win.document.close()
    return { ok: true, method: 'browser-print' }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      method: 'browser-print',
    }
  }
}


/* ────────────────────────────────────────────────────────
   Network printing — branches on runtime.
   • Server (Node.js, no `window`): dynamic import of escpos-server
     which talks raw TCP via `node:net` on port 9100. The dynamic
     import is `webpackIgnore: true`-safe so client bundles never
     pull in `node:net`.
   • Browser: POST to /api/pos/print/network so the server does it
     instead. The endpoint validates the printer config and runs the
     same TCP write.
   ──────────────────────────────────────────────────────── */
async function networkPrint(
  ip: string,
  port: number,
  data: Uint8Array
): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    // Server-side path. The /* webpackIgnore */ hint tells webpack to
    // emit the import without trying to bundle `node:net`.
    // Use an indirected dynamic import so the bundler does NOT try to
    // resolve './escpos-server' (which imports `node:net`) at build time.
    // The new Function() trick keeps the import target opaque to webpack.
    const moduleSpecifier = './escpos-server'
    const dyn = new Function('s', 'return import(s)') as (s: string) => Promise<any>
    const mod = await dyn(moduleSpecifier)
    return mod.sendToNetworkPrinter(ip, port, data)
  }
  // Browser-side path: forward to the server endpoint.
  try {
    const res = await fetch('/api/pos/print/network', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/octet-stream', 'X-Printer-Ip': ip, 'X-Printer-Port': String(port) },
      body: data,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: text || `HTTP ${res.status}` }
    }
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    return { ok: !!json.ok, error: json.error }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
