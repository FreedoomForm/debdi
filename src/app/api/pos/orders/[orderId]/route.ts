import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePosAuth,
  notFound,
  serverError,
} from '@/lib/pos/auth'

/**
 * GET /api/pos/orders/[orderId]
 * Returns order detail with all line items, payments, and receipts.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { orderId } = await params
  const order = await db.order.findFirst({
    where: { id: orderId, adminId: ctx.ownerAdminId },
    include: {
      items: true,
      payments: true,
      receipts: true,
      customer: { select: { id: true, name: true, phone: true } },
    },
  })
  if (!order) return notFound()
  return NextResponse.json({ item: order })
}
