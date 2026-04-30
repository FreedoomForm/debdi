import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePosAuth,
  notFound,
  serverError,
} from '@/lib/pos/auth'

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
