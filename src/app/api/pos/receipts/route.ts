import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePosAuth, serverError } from '@/lib/pos/auth'

/**
 * GET /api/pos/receipts
 *
 * Lists every Receipt for the current owner with order, customer and
 * print/email/sms metadata. Used by the new /pos/receipts UI.
 *
 * Query params:
 *   • from / to — ISO datetimes
 *   • type      — SALE / REFUND / VOID
 *   • format    — 80mm / 58mm / A4 / EMAIL
 *   • limit     — ≤ 500 (default 200)
 */
export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const type = searchParams.get('type')
  const format = searchParams.get('format')
  const limit = Math.min(Number(searchParams.get('limit')) || 200, 500)

  try {
    const items = await db.receipt.findMany({
      where: {
        order: { ownerAdminId: ctx.ownerAdminId },
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
        ...(type ? { type: type as any } : {}),
        ...(format ? { format } : {}),
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            grandTotal: true,
            customer: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return NextResponse.json({ items })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
