import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  requirePosAuth,
  badRequest,
  notFound,
  serverError,
} from '@/lib/pos/auth'

/**
 * POST /api/pos/orders/[orderId]/refund
 *
 * Issues a refund (full or partial) against an order. We do NOT delete
 * the original order — instead we record a negative-amount Payment row
 * (status=REFUNDED), restock the affected products, and emit an audit event.
 *
 * Body:
 *   { lines?: Array<{ orderItemId: string; quantity: number }>,
 *     amount?: number,
 *     method?: 'CASH' | 'CARD' | 'TRANSFER',
 *     reason?: string }
 *
 * If `lines` is given we reverse those specific items (and restock the
 * matching products); otherwise an `amount`-only refund is recorded
 * (useful when the cashier just wants to give money back).
 */

const lineSchema = z.object({
  orderItemId: z.string(),
  quantity: z.number().positive(),
})

const bodySchema = z.object({
  lines: z.array(lineSchema).optional(),
  amount: z.number().positive().optional(),
  method: z.enum(['CASH', 'CARD', 'TRANSFER']).default('CASH'),
  reason: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { orderId } = await params
  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)

  const order = await db.order.findFirst({
    where: { id: orderId, adminId: ctx.ownerAdminId },
    include: { items: true, payments: true },
  })
  if (!order) return notFound()

  if (!parsed.data.lines && !parsed.data.amount) {
    return badRequest('refund_requires_lines_or_amount')
  }

  try {
    const result = await db.$transaction(async (tx) => {
      let refundAmount = parsed.data.amount ?? 0

      if (parsed.data.lines && parsed.data.lines.length > 0) {
        for (const ln of parsed.data.lines) {
          const item = order.items.find((i) => i.id === ln.orderItemId)
          if (!item) throw new Error(`order_item_not_found:${ln.orderItemId}`)
          const refundQty = Math.min(ln.quantity, item.quantity)
          const lineUnitTotal = item.total / Math.max(1, item.quantity)
          refundAmount += lineUnitTotal * refundQty
          // Restock product if applicable.
          if (item.productId) {
            const p = await tx.product.findUnique({
              where: { id: item.productId },
              select: { trackStock: true },
            })
            if (p?.trackStock) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stockOnHand: { increment: refundQty } },
              })
              await tx.stockMovement.create({
                data: {
                  productId: item.productId,
                  type: 'RETURN',
                  quantity: refundQty,
                  reason: parsed.data.reason || 'Refund',
                  reference: order.id,
                  performedBy: ctx.user.id,
                },
              })
            }
          }
        }
      }

      // Record refund payment (negative amount, status=REFUNDED).
      const refund = await tx.payment.create({
        data: {
          orderId: order.id,
          method: parsed.data.method as any,
          amount: -refundAmount,
          status: 'REFUNDED' as any,
          processedBy: ctx.user.id,
          reference: parsed.data.reason ?? null,
        },
      })

      // Update parent payment(s) refunded amount tracker — best effort.
      const remaining = refundAmount
      let leftToCredit = remaining
      for (const p of order.payments.filter(
        (x) => x.status === 'COMPLETED' && x.amount > 0
      )) {
        if (leftToCredit <= 0) break
        const credit = Math.min(p.amount - p.refundedAmount, leftToCredit)
        if (credit > 0) {
          await tx.payment.update({
            where: { id: p.id },
            data: {
              refundedAmount: { increment: credit },
              status:
                p.refundedAmount + credit >= p.amount
                  ? 'REFUNDED'
                  : ('PARTIALLY_REFUNDED' as any),
            },
          })
          leftToCredit -= credit
        }
      }

      // Update order paymentStatus.
      const totalPaid =
        order.payments.reduce((s, p) => s + (p.amount || 0), 0) -
        refundAmount
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus:
            totalPaid <= 0
              ? 'UNPAID'
              : totalPaid < order.grandTotal
                ? 'PARTIAL'
                : 'PAID',
        },
      })

      await tx.orderAuditEvent.create({
        data: {
          orderId: order.id,
          eventType: 'PAYMENT_UPDATED',
          actorAdminId: ctx.user.id,
          actorRole: ctx.user.role,
          message: `Refund: ${refundAmount} (${parsed.data.reason ?? 'no reason'})`,
        },
      })

      return { refund, refundAmount }
    })

    return NextResponse.json({
      ok: true,
      refundAmount: result.refundAmount,
      paymentId: result.refund.id,
    })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
