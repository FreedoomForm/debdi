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
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { id } = await params
  const existing = await db.productCategory.findFirst({
    where: { id, ownerAdminId: ctx.ownerAdminId },
    select: { id: true },
  })
  if (!existing) return notFound()
  const json = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)
  try {
    const updated = await db.productCategory.update({
      where: { id },
      data: parsed.data,
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
  // Check no products attached.
  const inUse = await db.product.count({
    where: { ownerAdminId: ctx.ownerAdminId, categoryId: id },
  })
  if (inUse > 0) return badRequest(`category_in_use:${inUse}`)
  await db.productCategory.deleteMany({
    where: { id, ownerAdminId: ctx.ownerAdminId },
  })
  return NextResponse.json({ ok: true })
}
