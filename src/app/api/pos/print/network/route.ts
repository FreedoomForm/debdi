import { NextRequest, NextResponse } from 'next/server'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'
import { sendToNetworkPrinter } from '@/lib/pos/escpos-server'

/**
 * POST /api/pos/print/network
 *
 * Browser-side companion endpoint for `printer-service.networkPrint`.
 *
 * The browser POSTs the raw ESC/POS byte stream as the request body and
 * passes the target printer's IP/port via headers. The server then opens a
 * TCP socket to <ip>:<port> and writes the bytes, so client bundles never
 * need access to `node:net`.
 *
 * Body:    binary `Uint8Array` (Content-Type: application/octet-stream)
 * Headers: X-Printer-Ip, X-Printer-Port
 */
export async function POST(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx

  const ip = request.headers.get('x-printer-ip')
  const portRaw = request.headers.get('x-printer-port') ?? '9100'
  const port = Number(portRaw)
  if (!ip || !Number.isFinite(port) || port <= 0 || port > 65535) {
    return badRequest('invalid_printer_target')
  }

  // Cap body size at 1 MiB — receipts are tiny but we want to refuse
  // accidentally-huge uploads early.
  const buf = await request.arrayBuffer()
  if (buf.byteLength === 0) return badRequest('empty_body')
  if (buf.byteLength > 1024 * 1024) return badRequest('payload_too_large')

  try {
    const res = await sendToNetworkPrinter(ip, port, new Uint8Array(buf))
    return NextResponse.json(res, { status: res.ok ? 200 : 502 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
