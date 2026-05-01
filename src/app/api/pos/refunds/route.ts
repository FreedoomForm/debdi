import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

/**
 * GET /api/pos/refunds
 *
 * Returns recent refund transactions for the current owner. A refund row is
 * any Payment with status REFUNDED / PARTIALLY_REFUNDED or with refundedAmount > 0.
 * Joined to the parent Order so the UI can show order # / customer / status.
 */
export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = Math.min(Number(searchParams.get('limit')) || 200, 500)

  try {
    const items = await db.payment.findMany({
      where: {
        order: { adminId: ctx.ownerAdminId },
        ...(from || to
          ? {
              processedAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
        OR: [
          { status: 'REFUNDED' },
          { status: 'PARTIALLY_REFUNDED' },
          { refundedAmount: { gt: 0 } },
        ],
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            paymentStatus: true,
            orderStatus: true,
            grandTotal: true,
            customer: { select: { id: true, name: true, phone: true } },
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

/**
 * POST /api/pos/refunds
 *
 * Records a refund (full or partial) on an existing payment.
 * Body: { paymentId, amount, reason? }
 *
 * Updates Payment.refundedAmount, sets status accordingly, and writes a
 * notification so managers see the event in /pos/notifications.
 */
const createSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const json = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)

  try {
    const payment = await db.payment.findUnique({
      where: { id: parsed.data.paymentId },
      include: {
        order: { select: { adminId: true, orderNumber: true } },
      },
    })
    if (!payment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    if (payment.order.adminId !== ctx.ownerAdminId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const newRefundedTotal = payment.refundedAmount + parsed.data.amount
    if (newRefundedTotal > payment.amount) {
      return badRequest('refund_exceeds_payment_amount')
    }

    const fullyRefunded = newRefundedTotal >= payment.amount - 0.001
    const updated = await db.payment.update({
      where: { id: payment.id },
      data: {
        refundedAmount: newRefundedTotal,
        status: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      },
    })

    await db.notification.create({
      data: {
        recipientId: ctx.ownerAdminId,
        type: 'SYSTEM',
        title: fullyRefunded
          ? `Полный возврат по заказу #${payment.order.orderNumber}`
          : `Частичный возврат по заказу #${payment.order.orderNumber}`,
        body: parsed.data.reason
          ? `Сумма: ${parsed.data.amount}. Причина: ${parsed.data.reason}`
          : `Сумма: ${parsed.data.amount}`,
        link: '/pos/refunds',
      },
    })

    return NextResponse.json({ item: updated }, { status: 201 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
