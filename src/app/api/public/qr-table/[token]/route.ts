import { NextRequest, NextResponse } from 'next/server'
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
