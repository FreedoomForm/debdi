import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

/**
 * KDS (Kitchen Display System) endpoint.
 *
 * GET — returns active orders the kitchen needs to prepare.
 * PATCH — bumps an order to the next stage (NEW → IN_PROCESS → DELIVERED).
 */

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { searchParams } = new URL(request.url)
  const station = searchParams.get('station') // future: filter by kitchen station
  void station

  try {
    const orders = await db.order.findMany({
      where: {
        adminId: ctx.ownerAdminId,
        deletedAt: null,
        orderStatus: { in: ['NEW', 'PENDING', 'IN_PROCESS'] },
        sourceChannel: { in: ['POS_TERMINAL', 'ADMIN_PANEL', 'CUSTOMER_PORTAL'] },
      },
      include: {
        items: true,
        customer: { select: { name: true, phone: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 100,
    })
    return NextResponse.json({ items: orders })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

const bumpSchema = z.object({
  orderId: z.string(),
  action: z.enum(['start', 'ready', 'recall']),
})

export async function PATCH(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const json = await request.json().catch(() => null)
  const parsed = bumpSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)

  const { orderId, action } = parsed.data
  const order = await db.order.findFirst({
    where: { id: orderId, adminId: ctx.ownerAdminId },
  })
  if (!order) return badRequest('order_not_found')

  const newStatus =
    action === 'start'
      ? 'IN_PROCESS'
      : action === 'ready'
        ? 'DELIVERED'
        : 'NEW'

  const updated = await db.order.update({
    where: { id: orderId },
    data: {
      orderStatus: newStatus as any,
      statusChangedAt: new Date(),
      ...(newStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
    },
  })

  await db.orderAuditEvent.create({
    data: {
      orderId,
      eventType: 'STATUS_CHANGED',
      actorAdminId: ctx.user.id,
      actorRole: ctx.user.role,
      previousStatus: order.orderStatus,
      nextStatus: newStatus as any,
      message: `KDS bump: ${action}`,
    },
  })

  return NextResponse.json({ item: updated })
}
