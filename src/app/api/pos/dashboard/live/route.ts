import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePosAuth, serverError } from '@/lib/pos/auth'

/**
 * GET /api/pos/dashboard/live
 *
 * Combines several "right now" snapshots used by widgets on the dashboard
 * and the operational header — open orders count, low-stock items, current
 * shift status, unread notifications. One call, one round-trip.
 */
export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx

  try {
    const [openOrders, lowStock, openShift, unreadNotifs, todayStart] =
      await Promise.all([
        db.order.count({
          where: {
            adminId: ctx.ownerAdminId,
            deletedAt: null,
            orderStatus: { in: ['NEW', 'PENDING', 'IN_PROCESS'] },
          },
        }),
        db.product.count({
          where: {
            ownerAdminId: ctx.ownerAdminId,
            isActive: true,
            trackStock: true,
            reorderLevel: { not: null },
            // Prisma doesn't support column-to-column comparisons in `where`,
            // so we use a simple cap; UI can still show "low" badges.
            stockOnHand: { lte: 10 },
          },
        }),
        db.cashierShift.findFirst({
          where: { cashierId: ctx.user.id, status: 'OPEN' },
          select: {
            id: true,
            openedAt: true,
            totalSales: true,
            ordersCount: true,
          },
        }),
        db.notification.count({
          where: { recipientId: ctx.ownerAdminId, isRead: false },
        }),
        Promise.resolve((() => {
          const d = new Date()
          d.setHours(0, 0, 0, 0)
          return d
        })()),
      ])

    const todayOrders = await db.order.aggregate({
      where: {
        adminId: ctx.ownerAdminId,
        deletedAt: null,
        createdAt: { gte: todayStart },
      },
      _sum: { grandTotal: true },
      _count: { id: true },
    })

    return NextResponse.json({
      openOrders,
      lowStock,
      openShift,
      unreadNotifs,
      today: {
        revenue: todayOrders._sum.grandTotal ?? 0,
        orders: todayOrders._count.id ?? 0,
      },
    })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
