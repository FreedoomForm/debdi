import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePosAuth, badRequest, serverError } from '@/lib/pos/auth'

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  isActive: z.boolean().optional(),
})

async function ensureOwnership(id: string, ownerAdminId: string) {
  const existing = await db.branch.findUnique({
    where: { id },
    select: { id: true, ownerAdminId: true },
  })
  if (!existing) {
    return { error: NextResponse.json({ error: 'not_found' }, { status: 404 }) }
  }
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

    const updated = await db.branch.update({
      where: { id },
      data: parsed.data,
    })
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
    await db.branch.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
