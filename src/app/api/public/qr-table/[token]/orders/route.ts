import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

/**
 * POST /api/public/qr-table/:token/orders  (public, no auth)
 *
 * Submits a guest-built order from the QR page. Creates a draft Order
 * (status=PENDING, paymentStatus=UNPAID) tied to the table — staff
 * confirms it in /pos/orders before serving / printing kitchen tickets.
 *
 * Hard caps:
 *  - 30 lines per order
 *  - 50 units per line
 *  - 280 chars in note
 */
type Ctx = { params: Promise<{ token: string }> }

const bodySchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(50),
      })
    )
    .min(1)
    .max(30),
  note: z.string().trim().max(280).optional(),
})

export async function POST(request: NextRequest, { params }: Ctx) {
  const { token } = await params
  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }
  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid payload' },
      { status: 400 }
    )
  }

  const table = await db.restaurantTable.findUnique({
    where: { qrToken: token },
    select: {
      id: true,
      name: true,
      qrEnabled: true,
      ownerAdminId: true,
    },
  })
  if (!table || !table.qrEnabled) {
    return NextResponse.json({ error: 'QR ordering disabled' }, { status: 404 })
  }

  // Resolve products + verify they belong to the same owner and are active.
  const products = await db.product.findMany({
    where: {
      id: { in: parsed.data.lines.map((l) => l.productId) },
      ownerAdminId: table.ownerAdminId,
      isActive: true,
    },
    select: { id: true, name: true, sellPrice: true, taxRate: true },
  })
  const byId = new Map(products.map((p) => [p.id, p]))
  const validLines = parsed.data.lines.filter((l) => byId.has(l.productId))
  if (validLines.length === 0) {
    return NextResponse.json(
      { error: 'No valid items in cart (some may have run out of stock)' },
      { status: 400 }
    )
  }

  let subtotal = 0
  let taxTotal = 0
  for (const l of validLines) {
    const p = byId.get(l.productId)!
    const lineNet = p.sellPrice * l.quantity
    subtotal += lineNet
    taxTotal += lineNet * p.taxRate
  }
  const grandTotal = subtotal + taxTotal

  try {
    // Compute next order number for this owner.
    const last = await db.order.findFirst({
      where: { ownerAdminId: table.ownerAdminId },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    })
    const nextNumber = (last?.orderNumber ?? 0) + 1

    const order = await db.order.create({
      data: {
        ownerAdminId: table.ownerAdminId,
        orderNumber: nextNumber,
        orderStatus: 'PENDING',
        paymentStatus: 'UNPAID',
        serviceMode: 'DINE_IN',
        tableId: table.id,
        notes: parsed.data.note
          ? `[QR ${table.name}] ${parsed.data.note}`
          : `[QR ${table.name}] Заказ через QR-код стола`,
        subtotal,
        taxTotal,
        discountTotal: 0,
        tipTotal: 0,
        grandTotal,
        items: {
          create: validLines.map((l) => {
            const p = byId.get(l.productId)!
            return {
              productId: p.id,
              name: p.name,
              quantity: l.quantity,
              unitPrice: p.sellPrice,
              total: p.sellPrice * l.quantity,
              taxAmount: p.sellPrice * l.quantity * p.taxRate,
            }
          }),
        },
      },
      select: { id: true, orderNumber: true },
    })

    // Notify the owner so staff sees the order arrive in real time.
    await db.notification.create({
      data: {
        ownerAdminId: table.ownerAdminId,
        type: 'ORDER_CREATED',
        title: `QR-заказ · стол ${table.name}`,
        body: `${validLines.length} поз. на ${Math.round(grandTotal).toLocaleString(
          'ru-RU'
        )} сум — подтвердите в /pos/orders`,
        link: `/pos/orders?focus=${order.id}`,
      },
    })

    return NextResponse.json(
      { ok: true, orderNumber: order.orderNumber },
      { status: 201 }
    )
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to submit order',
      },
      { status: 500 }
    )
  }
}
