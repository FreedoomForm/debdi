import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePosAuth, serverError } from '@/lib/pos/auth'

/**
 * Sales report — aggregate metrics for a date range.
 * Used by the dashboard "Sales", "Top products", "Cashier performance" widgets.
 */
export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  const from = fromParam
    ? new Date(fromParam)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const to = toParam ? new Date(toParam) : new Date()

  try {
    // Aggregate over orders in range.
    const orders = await db.order.findMany({
      where: {
        adminId: ctx.ownerAdminId,
        deletedAt: null,
        createdAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        grandTotal: true,
        subtotal: true,
        taxTotal: true,
        discountTotal: true,
        tipTotal: true,
        paymentMethod: true,
        paymentStatus: true,
        orderStatus: true,
        sourceChannel: true,
        serviceMode: true,
        createdAt: true,
      },
    })

    const totals = orders.reduce(
      (acc, o) => {
        acc.gross += o.grandTotal || 0
        acc.tax += o.taxTotal || 0
        acc.discount += o.discountTotal || 0
        acc.tip += o.tipTotal || 0
        acc.count += 1
        if (o.paymentMethod === 'CASH') acc.cash += o.grandTotal || 0
        if (o.paymentMethod === 'CARD') acc.card += o.grandTotal || 0
        if (o.paymentMethod === 'TRANSFER') acc.transfer += o.grandTotal || 0
        return acc
      },
      {
        gross: 0,
        tax: 0,
        discount: 0,
        tip: 0,
        count: 0,
        cash: 0,
        card: 0,
        transfer: 0,
      }
    )

    // Daily series.
    const byDay = new Map<string, { date: string; revenue: number; orders: number }>()
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10)
      const cur = byDay.get(key) ?? { date: key, revenue: 0, orders: 0 }
      cur.revenue += o.grandTotal || 0
      cur.orders += 1
      byDay.set(key, cur)
    }
    const series = Array.from(byDay.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    // Top products.
    const topRows = await db.orderItem.groupBy({
      by: ['productId', 'name'],
      where: {
        order: {
          adminId: ctx.ownerAdminId,
          deletedAt: null,
          createdAt: { gte: from, lte: to },
        },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 10,
    })
    const topProducts = topRows.map((r) => ({
      productId: r.productId,
      name: r.name,
      qty: r._sum.quantity ?? 0,
      revenue: r._sum.total ?? 0,
    }))

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      totals,
      series,
      topProducts,
      averageTicket: totals.count ? totals.gross / totals.count : 0,
    })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
