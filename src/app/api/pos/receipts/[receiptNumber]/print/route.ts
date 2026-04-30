import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { renderReceiptHtml } from '@/lib/pos'
import type { ReceiptPayload } from '@/lib/pos'

/**
 * GET /api/pos/receipts/:receiptNumber/print
 *
 * Returns a printable HTML receipt that can be opened in a new window;
 * the page auto-triggers `window.print()` on load.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  const { receiptNumber } = await params
  const receipt = await db.receipt.findUnique({
    where: { receiptNumber },
  })
  if (!receipt) {
    return new NextResponse('Receipt not found', { status: 404 })
  }
  // Mark as printed
  await db.receipt.update({
    where: { id: receipt.id },
    data: { printedAt: new Date() },
  })
  const payload = receipt.payload as unknown as ReceiptPayload
  const html = renderReceiptHtml(payload, receipt.format === '58mm' ? '58mm' : '80mm')
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
