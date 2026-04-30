import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().nullable().optional(),
  type: z.enum(['PERCENT', 'FIXED', 'BOGO', 'BUNDLE']).optional(),
  value: z.number().nonnegative().optional(),
  minSubtotal: z.number().nonnegative().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  usageLimit: z.number().int().nullable().optional(),
  isActive: z.boolean().optional(),
})

async function ensureOwnership(id: string, ownerAdminId: string) {
  const existing = await db.discount.findUnique({
    where: { id },
    select: { id: true, ownerAdminId: true },
  })
  if (!existing) return { error: NextResponse.json({ error: 'not_found' }, { status: 404 }) }
  if (existing.ownerAdminId !== ownerAdminId) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  }
  return { existing }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { id } = await context.params
  const json = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)

  try {
    const own = await ensureOwnership(id, ctx.ownerAdminId)
    if ('error' in own) return own.error

    const data: Record<string, unknown> = { ...parsed.data }
    if ('startsAt' in parsed.data) {
      data.startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null
    }
    if ('endsAt' in parsed.data) {
      data.endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null
    }

    const updated = await db.discount.update({ where: { id }, data })
    return NextResponse.json({ item: updated })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { id } = await context.params

  try {
    const own = await ensureOwnership(id, ctx.ownerAdminId)
    if ('error' in own) return own.error

    await db.discount.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
