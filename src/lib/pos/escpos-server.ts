/**
 * Server-only ESC/POS transports.
 *
 * Imports `node:net` at the top level — this file MUST NEVER be imported
 * from a browser bundle. We isolate it here (instead of inside a dynamic
 * import in escpos.ts) so webpack doesn't attempt to resolve `node:net`
 * when escpos.ts is reachable from a client component (the failure mode
 * before this split: `Reading from "node:net" is not handled by plugins`).
 *
 * Consumers: only API route handlers and other server-only code may
 * import from this file. The browser-safe builders / renderers live in
 * `./escpos.ts` and the public barrel re-exports those.
 */
import 'server-only'
import { Socket } from 'node:net'

/** Send raw ESC/POS bytes to a network printer at <ip>:<port>. */
export async function sendToNetworkPrinter(
  ip: string,
  port: number,
  data: Uint8Array
): Promise<{ ok: boolean; error?: string }> {
  return await new Promise((resolve) => {
    const sock = new Socket()
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
    try {
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
    } catch (err) {
      cleanup({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  })
}
