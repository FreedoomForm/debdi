import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePosAuth, serverError } from '@/lib/pos/auth'

/**
 * GET /api/pos/reports/forecast
 *
 * AI-style demand forecasting endpoint. Given historical orders for the
 * current owner, returns a 7-day-ahead forecast of:
 *   • daily revenue
 *   • daily order count
 *   • per-product expected quantity (top N)
 *
 * Algorithm: Holt-Winters-lite — seasonal naïve + EWMA. We bucket the
 * past `lookback` days into day-of-week classes, then compute the
 * exponentially-weighted average per (DoW, metric). For per-product
 * forecasts we use a 14-day moving average of OrderItem quantities.
 *
 * No external ML library: purely numeric so we can run on any Vercel
 * function with zero cold-start cost.
 *
 * Query params:
 *   • lookback   default 56  (days of history)
 *   • horizon    default 7   (days ahead)
 *   • topProducts default 8
 */
export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(request.url)
  const lookback = Math.max(
    14,
    Math.min(180, Number(searchParams.get('lookback') ?? 56))
  )
  const horizon = Math.max(
    1,
    Math.min(30, Number(searchParams.get('horizon') ?? 7))
  )
  const topN = Math.max(
    3,
    Math.min(20, Number(searchParams.get('topProducts') ?? 8))
  )

  try {
    const now = new Date()
    const from = new Date(now.getTime() - lookback * 86_400_000)

    // ─── Pull all orders + line items in the lookback window ──────────────
    const orders = await db.order.findMany({
      where: {
        adminId: ctx.ownerAdminId,
        deletedAt: null,
        createdAt: { gte: from, lte: now },
      },
      select: {
        id: true,
        grandTotal: true,
        createdAt: true,
        items: {
          select: {
            productId: true,
            name: true,
            quantity: true,
          },
        },
      },
    })

    // ─── Bucket by local YYYY-MM-DD ──────────────────────────────────────
    type DayBucket = { revenue: number; orders: number; dow: number }
    const byDay = new Map<string, DayBucket>()
    const productByDay = new Map<string, Map<string, number>>()
    const productNames = new Map<string, string>()

    for (const o of orders) {
      const d = new Date(o.createdAt)
      const key = d.toISOString().slice(0, 10)
      const dow = d.getDay()
      const b = byDay.get(key) ?? { revenue: 0, orders: 0, dow }
      b.revenue += o.grandTotal
      b.orders += 1
      byDay.set(key, b)

      let pBucket = productByDay.get(key)
      if (!pBucket) {
        pBucket = new Map()
        productByDay.set(key, pBucket)
      }
      for (const it of o.items) {
        const pid = it.productId ?? `name:${it.name}`
        productNames.set(pid, it.name)
        pBucket.set(pid, (pBucket.get(pid) ?? 0) + it.quantity)
      }
    }

    // ─── Day-of-week EWMA (alpha = 0.35) for revenue & orders ────────────
    const ALPHA = 0.35
    const dowRevenue: Record<number, number> = {}
    const dowOrders: Record<number, number> = {}
    const dowSamples: Record<number, number> = {}
    const sortedKeys = [...byDay.keys()].sort()
    for (const k of sortedKeys) {
      const b = byDay.get(k)!
      const prevR = dowRevenue[b.dow] ?? b.revenue
      const prevO = dowOrders[b.dow] ?? b.orders
      dowRevenue[b.dow] = ALPHA * b.revenue + (1 - ALPHA) * prevR
      dowOrders[b.dow] = ALPHA * b.orders + (1 - ALPHA) * prevO
      dowSamples[b.dow] = (dowSamples[b.dow] ?? 0) + 1
    }

    // ─── Build horizon-day forecast ──────────────────────────────────────
    const forecast: Array<{
      date: string
      dow: number
      revenue: number
      orders: number
      avgTicket: number
      confidence: number // 0..1 based on history depth for this DoW
    }> = []
    for (let i = 1; i <= horizon; i++) {
      const d = new Date(now.getTime() + i * 86_400_000)
      const dow = d.getDay()
      const rev = Math.round(dowRevenue[dow] ?? 0)
      const ord = Math.round(dowOrders[dow] ?? 0)
      const samples = dowSamples[dow] ?? 0
      forecast.push({
        date: d.toISOString().slice(0, 10),
        dow,
        revenue: rev,
        orders: ord,
        avgTicket: ord > 0 ? Math.round(rev / ord) : 0,
        // Simple confidence: more history per DoW → higher confidence.
        confidence: Math.min(1, samples / 8),
      })
    }

    // ─── Per-product 14-day moving average forecast ──────────────────────
    const recentDays = sortedKeys.slice(-14)
    const productTotals = new Map<string, number>()
    for (const k of recentDays) {
      const pBucket = productByDay.get(k)
      if (!pBucket) continue
      for (const [pid, qty] of pBucket.entries()) {
        productTotals.set(pid, (productTotals.get(pid) ?? 0) + qty)
      }
    }
    const productForecasts = [...productTotals.entries()]
      .map(([pid, qty]) => ({
        productId: pid.startsWith('name:') ? null : pid,
        name: productNames.get(pid) ?? '—',
        avgPerDay: qty / Math.max(recentDays.length, 1),
        nextWeek: (qty / Math.max(recentDays.length, 1)) * horizon,
      }))
      .sort((a, b) => b.nextWeek - a.nextWeek)
      .slice(0, topN)
      .map((x) => ({
        ...x,
        avgPerDay: Math.round(x.avgPerDay * 10) / 10,
        nextWeek: Math.round(x.nextWeek),
      }))

    // ─── Aggregate forecast totals ───────────────────────────────────────
    const totals = forecast.reduce(
      (acc, f) => {
        acc.revenue += f.revenue
        acc.orders += f.orders
        return acc
      },
      { revenue: 0, orders: 0 }
    )

    return NextResponse.json({
      meta: {
        lookbackDays: lookback,
        horizonDays: horizon,
        sampleDays: byDay.size,
        sampleOrders: orders.length,
        generatedAt: now.toISOString(),
        algorithm: 'seasonal-naive + EWMA(alpha=0.35) + 14-day MA per SKU',
      },
      forecast,
      totals: {
        revenue: totals.revenue,
        orders: totals.orders,
        avgTicket:
          totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0,
      },
      products: productForecasts,
    })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
