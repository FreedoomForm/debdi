import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

/**
 * GET /api/public/qr-table/:token  (public, no auth)
 *
 * Returns the menu + branding for the QR-ordering page that customers see
 * after scanning the sticker on their table. Surfaces only what's needed
 * to render the public ordering page — no admin data, no costs, no shifts.
 */
type Ctx = { params: Promise<{ token: string }> }

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { token } = await params
  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const table = await db.restaurantTable.findUnique({
    where: { qrToken: token },
    select: {
      id: true,
      name: true,
      qrEnabled: true,
      ownerAdminId: true,
      section: { select: { name: true } },
    },
  })

  if (!table || !table.qrEnabled) {
    return NextResponse.json({ error: 'QR ordering disabled' }, { status: 404 })
  }

  // Pull the active product catalog scoped to this owner.
  const [products, categories, owner] = await Promise.all([
    db.product.findMany({
      where: {
        ownerAdminId: table.ownerAdminId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        sellPrice: true,
        imageUrl: true,
        categoryId: true,
        unit: true,
        color: true,
      },
      orderBy: { name: 'asc' },
    }),
    db.productCategory.findMany({
      where: { ownerAdminId: table.ownerAdminId, isActive: true },
      select: { id: true, name: true, color: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    }),
    db.admin.findUnique({
      where: { id: table.ownerAdminId },
      select: { name: true },
    }),
  ])

  return NextResponse.json({
    storeName: owner?.name ?? 'Меню',
    table: { id: table.id, name: table.name, section: table.section?.name ?? null },
    categories,
    products,
  })
}

/**
 * POST /api/public/qr-table/:token  (public, no auth)
 *
 * Accepts a guest order from the QR-table page. Creates a lightweight
 * Customer record (or finds existing by phone) and an Order with items,
 * routed to the kitchen via the existing /api/pos/kds feed.
 *
 * Inspired by Odoo PoS QR ordering and Square 'order at table'.
 */
const submitSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().min(0.01).max(99),
      })
    )
    .min(1)
    .max(50),
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
})

export async function POST(request: NextRequest, { params }: Ctx) {
  const { token } = await params
  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const json = await request.json().catch(() => null)
  const parsed = submitSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }
  const { items, name, phone, notes } = parsed.data

  const table = await db.restaurantTable.findUnique({
    where: { qrToken: token },
    select: { id: true, name: true, qrEnabled: true, ownerAdminId: true },
  })
  if (!table || !table.qrEnabled) {
    return NextResponse.json({ error: 'QR ordering disabled' }, { status: 404 })
  }

  // Validate the products belong to this owner.
  const productIds = items.map((it) => it.productId)
  const products = await db.product.findMany({
    where: {
      id: { in: productIds },
      ownerAdminId: table.ownerAdminId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      sku: true,
      sellPrice: true,
      taxRate: true,
    },
  })
  if (products.length !== productIds.length) {
    return NextResponse.json({ error: 'Some products are not available' }, { status: 400 })
  }

  const productMap = new Map(products.map((p) => [p.id, p]))
  const lineItems = items.map((it) => {
    const p = productMap.get(it.productId)!
    const unitPrice = p.sellPrice
    const taxRate = p.taxRate ?? 0
    const subtotal = unitPrice * it.quantity
    const tax = subtotal * taxRate
    return {
      productId: p.id,
      name: p.name,
      sku: p.sku ?? null,
      quantity: it.quantity,
      unitPrice,
      discount: 0,
      taxRate,
      total: subtotal + tax,
    }
  })
  const subtotal = lineItems.reduce((s, l) => s + l.total, 0)

  // Find or create a guest customer scoped to this owner.
  const phoneKey = phone || `qr-guest-${Date.now()}`
  let customer = phone
    ? await db.customer.findFirst({
        where: {
          phone: phoneKey,
          createdBy: table.ownerAdminId,
          deletedAt: null,
        },
      })
    : null
  if (!customer) {
    customer = await db.customer.create({
      data: {
        name,
        phone: phoneKey,
        address: `Table ${table.name}`,
        createdBy: table.ownerAdminId,
      },
    })
  }

  // Allocate next order number for this owner.
  const last = await db.order.findFirst({
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  })
  const orderNumber = (last?.orderNumber ?? 0) + 1

  const order = await db.order.create({
    data: {
      orderNumber,
      orderStatus: 'NEW',
      customerId: customer.id,
      adminId: table.ownerAdminId,
      tableId: table.id,
      deliveryAddress: `Table ${table.name}`,
      notes: notes || null,
      subtotal,
      taxTotal: lineItems.reduce((s, l) => s + l.unitPrice * l.quantity * (l.taxRate ?? 0), 0),
      grandTotal: subtotal,
      sourceChannel: 'CUSTOMER_PORTAL',
      serviceMode: 'DINE_IN',
      items: {
        create: lineItems,
      },
    },
    select: { id: true, orderNumber: true },
  })

  // Push a system notification so cashiers/managers see the new order.
  await db.notification
    .create({
      data: {
        ownerAdminId: table.ownerAdminId,
        type: 'ORDER_CREATED',
        title: `Стол ${table.name}: новый QR-заказ #${order.orderNumber}`,
        body: `${name} · ${lineItems.reduce((n, l) => n + l.quantity, 0)} позиций · ${Math.round(subtotal)} сум`,
        link: `/pos/orders?focus=${order.id}`,
      },
    })
    .catch(() => {
      /* notifications are best-effort */
    })

  return NextResponse.json({ ok: true, orderNumber: order.orderNumber })
}
