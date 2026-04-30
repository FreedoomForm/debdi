import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  requirePosAuth,
  badRequest,
  notFound,
  serverError,
} from '@/lib/pos/auth'

// Body is intentionally empty for this endpoint — the action is unambiguous
// ("receive this PO"), but we keep the schema so the API-contract test passes
// and so future fields (partial receipt qty per line, restocking notes) have
// a place to land without a breaking change.
const bodySchema = z.object({}).optional()

/**
 * POST /api/pos/purchase-orders/[id]/receive
 *
 * Marks a purchase order as RECEIVED, increments product stock for each line
 * (where productId is set), and writes an audit StockMovement.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { id } = await params
  // Validate (and discard) the body so we have a single chokepoint when
  // future fields arrive.
  const json = await request.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)

  const po = await db.purchaseOrder.findFirst({
    where: { id, ownerAdminId: ctx.ownerAdminId },
    include: { items: true },
  })
  if (!po) return notFound()
  if (po.status === 'RECEIVED') {
    return NextResponse.json({ ok: true, alreadyReceived: true })
  }

  try {
    await db.$transaction(async (tx) => {
      for (const it of po.items) {
        if (it.productId) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stockOnHand: { increment: it.quantity } },
          })
          await tx.stockMovement.create({
            data: {
              productId: it.productId,
              type: 'PURCHASE',
              quantity: it.quantity,
              costPrice: it.unitCost,
              reason: `PO ${po.reference ?? po.id.slice(-8)}`,
              reference: po.id,
              performedBy: ctx.user.id,
            },
          })
        }
        if (it.warehouseItemId) {
          await tx.warehouseItem.update({
            where: { id: it.warehouseItemId },
            data: {
              amount: { increment: it.quantity },
              pricePerUnit: it.unitCost,
            },
          })
        }
      }
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'RECEIVED', receivedAt: new Date() },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
