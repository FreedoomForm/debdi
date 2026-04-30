import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  requirePosAuth,
  badRequest,
  notFound,
  serverError,
} from '@/lib/pos/auth'

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  costPrice: z.number().nonnegative().optional().nullable(),
  sellPrice: z.number().nonnegative().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  trackStock: z.boolean().optional(),
  stockOnHand: z.number().optional(),
  reorderLevel: z.number().nonnegative().optional().nullable(),
  unit: z.string().optional(),
  isActive: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  color: z.string().optional().nullable(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { id } = await params
  const item = await db.product.findFirst({
    where: { id, ownerAdminId: ctx.ownerAdminId },
    include: { category: true, variants: true, modifiers: true },
  })
  if (!item) return notFound()
  return NextResponse.json({ item })
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { id } = await params
  const existing = await db.product.findFirst({
    where: { id, ownerAdminId: ctx.ownerAdminId },
    select: { id: true },
  })
  if (!existing) return notFound()
  const json = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)
  try {
    const updated = await db.product.update({
      where: { id },
      data: parsed.data,
      include: { category: true, variants: true },
    })
    return NextResponse.json({ item: updated })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { id } = await params
  const existing = await db.product.findFirst({
    where: { id, ownerAdminId: ctx.ownerAdminId },
    select: { id: true },
  })
  if (!existing) return notFound()
  // Soft delete via isActive=false to preserve referential integrity for past
  // sales / stock movements.
  await db.product.update({
    where: { id },
    data: { isActive: false },
  })
  return NextResponse.json({ ok: true })
}
