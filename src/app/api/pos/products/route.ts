import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

const createSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  costPrice: z.number().nonnegative().optional().nullable(),
  sellPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(1).default(0),
  trackStock: z.boolean().default(true),
  stockOnHand: z.number().default(0),
  reorderLevel: z.number().nonnegative().optional().nullable(),
  unit: z.string().default('pcs'),
  isActive: z.boolean().default(true),
  isFavorite: z.boolean().default(false),
  color: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { ownerAdminId } = ctx

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const categoryId = searchParams.get('categoryId')
  const onlyActive = searchParams.get('active') !== '0'

  try {
    const items = await db.product.findMany({
      where: {
        ownerAdminId,
        ...(onlyActive ? { isActive: true } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' as const } },
                { sku: { contains: q, mode: 'insensitive' as const } },
                { barcode: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        variants: { where: { isActive: true } },
      },
      orderBy: [{ isFavorite: 'desc' }, { name: 'asc' }],
      take: 1000,
    })
    return NextResponse.json({ items })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { ownerAdminId } = ctx

  const json = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)

  try {
    const created = await db.product.create({
      data: { ...parsed.data, ownerAdminId },
      include: { category: true },
    })
    return NextResponse.json({ item: created }, { status: 201 })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
