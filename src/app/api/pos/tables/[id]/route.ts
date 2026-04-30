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
  name: z.string().min(1).max(64).optional(),
  sectionId: z.string().optional().nullable(),
  capacity: z.number().int().min(1).optional(),
  shape: z.enum(['rect', 'circle', 'square']).optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  status: z
    .enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'BLOCKED'])
    .optional(),
  currentOrderId: z.string().nullable().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { id } = await params
  const existing = await db.restaurantTable.findFirst({
    where: { id, ownerAdminId: ctx.ownerAdminId },
    select: { id: true },
  })
  if (!existing) return notFound()
  const json = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)
  try {
    const updated = await db.restaurantTable.update({
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
  await db.restaurantTable.deleteMany({
    where: { id, ownerAdminId: ctx.ownerAdminId },
  })
  return NextResponse.json({ ok: true })
}
