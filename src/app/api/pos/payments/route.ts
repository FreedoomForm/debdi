import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

/**
 * GET /api/pos/payments — list payments for the current owner with filters.
 *
 * Filters: from / to (ISO datetimes), status, method, shiftId, limit (≤ 500).
 * Joins order so the UI can show order number / customer name.
 */
export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const status = searchParams.get('status')
  const method = searchParams.get('method')
  const shiftId = searchParams.get('shiftId')
  const limit = Math.min(Number(searchParams.get('limit')) || 200, 500)

  try {
    const items = await db.payment.findMany({
      where: {
        order: { ownerAdminId: ctx.ownerAdminId },
        ...(from || to
          ? {
              processedAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
        ...(status ? { status: status as any } : {}),
        ...(method ? { method: method as any } : {}),
        ...(shiftId ? { shiftId } : {}),
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
      orderBy: { processedAt: 'desc' },
      take: limit,
    })
    return NextResponse.json({ items })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

const refundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().trim().max(280).optional(),
})

/**
 * POST /api/pos/payments — record a refund against an existing payment.
 * Body: { paymentId, amount, reason? }. Updates Payment.refundedAmount and
 * sets status to REFUNDED / PARTIALLY_REFUNDED accordingly.
 */
export async function POST(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const json = await request.json().catch(() => null)
  const parsed = refundSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)

  try {
    const payment = await db.payment.findFirst({
      where: {
        id: parsed.data.paymentId,
        order: { ownerAdminId: ctx.ownerAdminId },
      },
      select: {
        id: true,
        amount: true,
        refundedAmount: true,
        status: true,
        orderId: true,
      },
    })
    if (!payment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const remaining = payment.amount - (payment.refundedAmount ?? 0)
    if (parsed.data.amount > remaining + 0.001) {
      return badRequest(
        `refund_exceeds_remaining: max=${remaining.toFixed(2)}`
      )
    }
    const newRefunded = (payment.refundedAmount ?? 0) + parsed.data.amount
    const newStatus =
      Math.abs(newRefunded - payment.amount) < 0.01
        ? 'REFUNDED'
        : 'PARTIALLY_REFUNDED'

    const updated = await db.payment.update({
      where: { id: payment.id },
      data: {
        refundedAmount: newRefunded,
        status: newStatus as any,
      },
    })
    return NextResponse.json({ item: updated })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
