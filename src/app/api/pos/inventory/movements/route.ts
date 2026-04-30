import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePosAuth, serverError } from '@/lib/pos/auth'

/**
 * GET /api/pos/inventory/movements
 *
 * Returns the stock movement ledger — every increment / decrement to inventory
 * with its reason, source order, and the admin who triggered it. Used by the
 * inventory audit page.
 */
export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId') || undefined
  const limit = Math.min(Number(searchParams.get('limit')) || 200, 500)

  try {
    const items = await db.stockMovement.findMany({
      where: {
        ...(productId ? { productId } : {}),
        product: { ownerAdminId: ctx.ownerAdminId },
      },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return NextResponse.json({ items })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
