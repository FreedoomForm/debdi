import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, notFound, serverError } from '@/lib/pos/auth'

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

const movementBody = z.object({
  productId: z.string().min(1),
  type: z.enum(['PURCHASE', 'ADJUSTMENT', 'RETURN', 'WASTE', 'TRANSFER']),
  quantity: z.number().finite(), // can be positive (incoming) or negative (waste)
  reason: z.string().trim().max(280).optional(),
  reference: z.string().trim().max(120).optional(),
})

/**
 * POST /api/pos/inventory/movements
 *
 * Records a manual stock movement (purchase, adjustment, return, waste,
 * transfer) and updates Product.stockOnHand atomically. Implements
 * "un-86" — automatically re-enables an isActive=false product when its
 * stockOnHand becomes positive again, completing the Auto-86 cycle started
 * in /api/pos/orders.
 */
export async function POST(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx

  const raw = await request.json().catch(() => null)
  const parsed = movementBody.safeParse(raw)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || 'Invalid payload')
  }
  const { productId, type, quantity, reason, reference } = parsed.data

  try {
    const product = await db.product.findFirst({
      where: { id: productId, ownerAdminId: ctx.ownerAdminId },
      select: {
        id: true,
        name: true,
        stockOnHand: true,
        trackStock: true,
        isActive: true,
      },
    })
    if (!product) return notFound('Товар не найден')

    const newStock = product.stockOnHand + quantity

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: product.id },
        data: {
          stockOnHand: { increment: quantity },
          // Un-86: auto-restore visibility once stock comes back.
          ...(quantity > 0 && newStock > 0 && !product.isActive
            ? { isActive: true }
            : {}),
          // Auto-86: if a manual write-down brings us to 0/negative, hide.
          ...(quantity < 0 && newStock <= 0 && product.isActive && product.trackStock
            ? { isActive: false }
            : {}),
        },
        select: { id: true, stockOnHand: true, isActive: true, name: true },
      })
      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          type,
          quantity,
          reason: reason ?? null,
          reference: reference ?? null,
          performedBy: ctx.user.id,
        },
      })
      // Notify on auto-86 from manual write-down.
      if (quantity < 0 && newStock <= 0 && product.isActive && product.trackStock) {
        await tx.notification.create({
          data: {
            ownerAdminId: ctx.ownerAdminId,
            type: 'LOW_STOCK',
            title: `Нет в наличии: ${updated.name}`,
            body: `Товар автоматически скрыт в POS-терминале (Auto-86) после движения склада.`,
            link: '/pos/products',
          },
        })
      }
      return { movement, product: updated }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
